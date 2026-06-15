using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PlaygroundGuide.Api.Data;
using PlaygroundGuide.Api.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("Default"),
        o => o.UseNetTopologySuite()
    )
);

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/playgrounds", async (double? lat, double? lng, double? radius, Guid? userId, AppDbContext db) =>
{
    if (lat is null || lng is null || radius is null)
        return Results.BadRequest(new { error = "lat, lng, and radius are required." });

    if (radius.Value <= 0)
        return Results.BadRequest(new { error = "radius must be greater than 0." });

    // Use longitude-adjusted degrees so the search radius is accurate east/west at the query latitude.
    // IsWithinDistance on geometry (SRID 4326) uses the GiST index; ::geography casts do not.
    var latRad = lat.Value * Math.PI / 180.0;
    var radiusDegrees = radius.Value / (111_320.0 * Math.Cos(latRad));
    var centre = new Point(lng.Value, lat.Value) { SRID = 4326 };

    var playgrounds = await db.Playgrounds
        .Where(p => !p.IsHidden
            && p.Location.IsWithinDistance(centre, radiusDegrees)
            && (userId == null || !db.UserHiddenPlaygrounds.Any(h => h.UserId == userId && h.PlaygroundId == p.Id)))
        .Select(p => new { p.Id, p.Name, p.Latitude, p.Longitude })
        .Take(200)
        .ToListAsync();

    return Results.Ok(playgrounds);
});

app.MapGet("/playgrounds/{id:guid}", async (Guid id, Guid? userId, AppDbContext db) =>
{
    var playground = await db.Playgrounds
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == id);

    if (playground is null)
        return Results.NotFound();

    var reviewed = await db.PlaygroundEnrichments
        .AsNoTracking()
        .Where(e => e.PlaygroundId == id && e.Reviewed)
        .ToListAsync();

    // null signals "no enrichment data yet"; empty list means enrichment exists but no equipment recorded
    var equipment = reviewed.Count == 0
        ? null
        : reviewed.SelectMany(e => e.Equipment).Distinct().Select(e => e.ToString()).ToList();

    var ageSuitability = reviewed.Count == 0
        ? null
        : reviewed.SelectMany(e => e.AgeSuitability).Distinct().Select(e => e.ToString()).ToList();

    var size = reviewed.Count == 0
        ? null
        : reviewed.Select(e => e.Size?.ToString()).FirstOrDefault(s => s != null);

    var otherEquipment = reviewed.Count == 0
        ? null
        : reviewed.Select(e => e.OtherEquipment).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));

    var transportInfo = reviewed.Count == 0
        ? null
        : reviewed.Select(e => e.TransportInfo).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));

    var notes = reviewed.Count == 0
        ? null
        : reviewed.Select(e => e.Notes).FirstOrDefault(s => !string.IsNullOrWhiteSpace(s));

    object? myEnrichment = null;
    if (userId is not null)
    {
        // Only ever the caller's own row — never another user's unreviewed data
        var mine = await db.PlaygroundEnrichments
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.PlaygroundId == id && e.UserId == userId);

        if (mine is not null)
            myEnrichment = ToEnrichmentResponse(mine);
    }

    return Results.Ok(new
    {
        playground.Id,
        playground.Name,
        playground.Latitude,
        playground.Longitude,
        Equipment = equipment,
        AgeSuitability = ageSuitability,
        Size = size,
        OtherEquipment = otherEquipment,
        TransportInfo = transportInfo,
        Notes = notes,
        MyEnrichment = myEnrichment,
    });
});

app.MapPost("/playgrounds/{id:guid}/enrichment", async (Guid id, EnrichmentRequest body, AppDbContext db) =>
{
    var (error, equipment, ageSuitability, size) = await ValidateEnrichment(id, body, db);
    if (error is not null)
        return error;

    var exists = await db.PlaygroundEnrichments
        .AnyAsync(e => e.PlaygroundId == id && e.UserId == body.UserId);
    if (exists)
        return Results.Conflict(new { error = "Enrichment already exists for this user; use PUT to update." });

    var enrichment = new PlaygroundEnrichment
    {
        PlaygroundId = id,
        UserId = body.UserId,
        Equipment = equipment!,
        AgeSuitability = ageSuitability!,
        Size = size,
        OtherEquipment = string.IsNullOrWhiteSpace(body.OtherEquipment) ? null : body.OtherEquipment.Trim(),
        TransportInfo = string.IsNullOrWhiteSpace(body.TransportInfo) ? null : body.TransportInfo.Trim(),
        Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim(),
        Reviewed = false,
        CreatedAt = DateTimeOffset.UtcNow,
    };

    db.PlaygroundEnrichments.Add(enrichment);
    await db.SaveChangesAsync();

    return Results.Created($"/playgrounds/{id}/enrichment", ToEnrichmentResponse(enrichment));
});

app.MapPut("/playgrounds/{id:guid}/enrichment", async (Guid id, EnrichmentRequest body, AppDbContext db) =>
{
    var (error, equipment, ageSuitability, size) = await ValidateEnrichment(id, body, db);
    if (error is not null)
        return error;

    var enrichment = await db.PlaygroundEnrichments
        .FirstOrDefaultAsync(e => e.PlaygroundId == id && e.UserId == body.UserId);
    if (enrichment is null)
        return Results.NotFound(new { error = "No enrichment to update for this user." });

    enrichment.Equipment = equipment!;
    enrichment.AgeSuitability = ageSuitability!;
    enrichment.Size = size;
    enrichment.OtherEquipment = string.IsNullOrWhiteSpace(body.OtherEquipment) ? null : body.OtherEquipment.Trim();
    enrichment.TransportInfo = string.IsNullOrWhiteSpace(body.TransportInfo) ? null : body.TransportInfo.Trim();
    enrichment.Notes = string.IsNullOrWhiteSpace(body.Notes) ? null : body.Notes.Trim();
    // Any edit re-enters review so edited data isn't shown publicly until re-approved
    enrichment.Reviewed = false;

    await db.SaveChangesAsync();

    return Results.Ok(ToEnrichmentResponse(enrichment));
});

app.MapGet("/admin/enrichments", async (HttpContext ctx, IConfiguration cfg, AppDbContext db) =>
{
    if (!AdminKeyValid(ctx, cfg))
        return Results.StatusCode(401);

    var entities = await db.PlaygroundEnrichments
        .AsNoTracking()
        .Where(e => !e.Reviewed)
        .Include(e => e.Playground)
        .OrderByDescending(e => e.CreatedAt)
        .ToListAsync();

    var pending = entities.Select(e => new
    {
        e.Id,
        e.PlaygroundId,
        PlaygroundName = e.Playground.Name,
        Equipment = e.Equipment.Select(eq => eq.ToString()).ToList(),
        AgeSuitability = e.AgeSuitability.Select(a => a.ToString()).ToList(),
        Size = e.Size?.ToString(),
        e.OtherEquipment,
        e.TransportInfo,
        e.Notes,
        e.CreatedAt,
    });

    return Results.Ok(pending);
});

app.MapPost("/admin/enrichments/{id:guid}/approve", async (Guid id, HttpContext ctx, IConfiguration cfg, AppDbContext db) =>
{
    if (!AdminKeyValid(ctx, cfg))
        return Results.StatusCode(401);

    var enrichment = await db.PlaygroundEnrichments.FindAsync(id);
    if (enrichment is null)
        return Results.NotFound(new { error = "Enrichment not found." });

    enrichment.Reviewed = true;
    await db.SaveChangesAsync();
    return Results.Ok(new { status = "approved" });
});

app.MapDelete("/admin/enrichments/{id:guid}", async (Guid id, HttpContext ctx, IConfiguration cfg, AppDbContext db) =>
{
    if (!AdminKeyValid(ctx, cfg))
        return Results.StatusCode(401);

    var enrichment = await db.PlaygroundEnrichments.FindAsync(id);
    if (enrichment is null)
        return Results.NotFound(new { error = "Enrichment not found." });

    db.PlaygroundEnrichments.Remove(enrichment);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/playgrounds/{id:guid}/favourite", async (Guid id, FavouriteRequest body, AppDbContext db) =>
{
    if (!await db.Playgrounds.AnyAsync(p => p.Id == id))
        return Results.NotFound(new { error = "Playground not found." });

    if (!await db.Users.AnyAsync(u => u.Id == body.UserId))
        return Results.BadRequest(new { error = "Unknown userId." });

    var exists = await db.UserFavourites.AnyAsync(f => f.PlaygroundId == id && f.UserId == body.UserId);
    if (!exists)
    {
        db.UserFavourites.Add(new UserFavourite
        {
            PlaygroundId = id,
            UserId = body.UserId,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Concurrent double-tap raced past the existence check; the composite PK
            // already prevents a duplicate, so treat it as the favourite being set.
        }
    }

    return Results.NoContent();
});

app.MapDelete("/playgrounds/{id:guid}/favourite", async (Guid id, Guid? userId, AppDbContext db) =>
{
    if (userId is null)
        return Results.BadRequest(new { error = "userId is required." });

    var favourite = await db.UserFavourites
        .FirstOrDefaultAsync(f => f.PlaygroundId == id && f.UserId == userId);
    if (favourite is not null)
    {
        db.UserFavourites.Remove(favourite);
        await db.SaveChangesAsync();
    }

    return Results.NoContent();
});

app.MapGet("/favourites", async (Guid? userId, AppDbContext db) =>
{
    if (userId is null)
        return Results.BadRequest(new { error = "userId is required." });

    var favourites = await db.UserFavourites
        .AsNoTracking()
        .Where(f => f.UserId == userId)
        .OrderByDescending(f => f.CreatedAt)
        .Select(f => new
        {
            f.Playground.Id,
            f.Playground.Name,
            f.Playground.Latitude,
            f.Playground.Longitude,
        })
        .ToListAsync();

    return Results.Ok(favourites);
});

app.MapPost("/playgrounds/{id:guid}/saved", async (Guid id, SavedRequest body, AppDbContext db) =>
{
    if (!await db.Playgrounds.AnyAsync(p => p.Id == id))
        return Results.NotFound(new { error = "Playground not found." });

    if (!await db.Users.AnyAsync(u => u.Id == body.UserId))
        return Results.BadRequest(new { error = "Unknown userId." });

    var exists = await db.UserSaved.AnyAsync(s => s.PlaygroundId == id && s.UserId == body.UserId);
    if (!exists)
    {
        db.UserSaved.Add(new UserSaved
        {
            PlaygroundId = id,
            UserId = body.UserId,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Concurrent double-tap raced past the existence check; the composite PK
            // already prevents a duplicate, so treat it as the saved entry being set.
        }
    }

    return Results.NoContent();
});

app.MapDelete("/playgrounds/{id:guid}/saved", async (Guid id, Guid? userId, AppDbContext db) =>
{
    if (userId is null)
        return Results.BadRequest(new { error = "userId is required." });

    var saved = await db.UserSaved
        .FirstOrDefaultAsync(s => s.PlaygroundId == id && s.UserId == userId);
    if (saved is not null)
    {
        db.UserSaved.Remove(saved);
        await db.SaveChangesAsync();
    }

    return Results.NoContent();
});

app.MapGet("/saved", async (Guid? userId, AppDbContext db) =>
{
    if (userId is null)
        return Results.BadRequest(new { error = "userId is required." });

    var saved = await db.UserSaved
        .AsNoTracking()
        .Where(s => s.UserId == userId)
        .OrderByDescending(s => s.CreatedAt)
        .Select(s => new
        {
            s.Playground.Id,
            s.Playground.Name,
            s.Playground.Latitude,
            s.Playground.Longitude,
        })
        .ToListAsync();

    return Results.Ok(saved);
});

app.MapPost("/playgrounds/{id:guid}/hide", async (Guid id, HideRequest body, AppDbContext db) =>
{
    if (!await db.Playgrounds.AnyAsync(p => p.Id == id))
        return Results.NotFound(new { error = "Playground not found." });

    if (!await db.Users.AnyAsync(u => u.Id == body.UserId))
        return Results.BadRequest(new { error = "Unknown userId." });

    var exists = await db.UserHiddenPlaygrounds.AnyAsync(h => h.PlaygroundId == id && h.UserId == body.UserId);
    if (!exists)
    {
        db.UserHiddenPlaygrounds.Add(new UserHiddenPlayground
        {
            PlaygroundId = id,
            UserId = body.UserId,
            CreatedAt = DateTimeOffset.UtcNow,
        });
        try
        {
            await db.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // Concurrent double-tap raced past the existence check; the composite PK
            // already prevents a duplicate, so treat it as the playground being hidden.
        }
    }

    return Results.NoContent();
});

app.MapPost("/playgrounds/{id:guid}/flag", async (Guid id, FlagRequest body, AppDbContext db) =>
{
    var playground = await db.Playgrounds.FirstOrDefaultAsync(p => p.Id == id);
    if (playground is null)
        return Results.NotFound(new { error = "Playground not found." });

    if (!await db.Users.AnyAsync(u => u.Id == body.UserId))
        return Results.BadRequest(new { error = "Unknown userId." });

    if (!Enum.TryParse<FlagType>(body.FlagType, out var flagType) || !Enum.IsDefined(flagType))
        return Results.BadRequest(new { error = $"Unknown flagType value: {body.FlagType}." });

    if (!Enum.TryParse<FlagReason>(body.Reason, out var reason) || !Enum.IsDefined(reason))
        return Results.BadRequest(new { error = $"Unknown reason value: {body.Reason}." });

    if (!string.IsNullOrWhiteSpace(body.ReasonNote) && body.ReasonNote.Trim().Length > 200)
        return Results.BadRequest(new { error = "reasonNote must be 200 characters or fewer." });

    var reasonNote = reason == FlagReason.Other && !string.IsNullOrWhiteSpace(body.ReasonNote)
        ? body.ReasonNote.Trim()
        : null;

    if (await db.PlaygroundFlags.AnyAsync(f => f.PlaygroundId == id && f.UserId == body.UserId))
        return Results.Conflict(new { error = "You have already flagged this playground." });

    db.PlaygroundFlags.Add(new PlaygroundFlag
    {
        PlaygroundId = id,
        UserId = body.UserId,
        FlagType = flagType,
        Reason = reason,
        ReasonNote = reasonNote,
        CreatedAt = DateTimeOffset.UtcNow,
    });
    playground.IsHidden = true;

    try
    {
        await db.SaveChangesAsync();
    }
    catch (DbUpdateException)
    {
        // Concurrent double-tap raced past the existence check; the unique index
        // already prevents a duplicate, so treat it as the playground being flagged.
        return Results.Conflict(new { error = "You have already flagged this playground." });
    }

    return Results.NoContent();
});

app.MapPost("/admin/playgrounds/{id:guid}/restore", async (Guid id, HttpContext ctx, IConfiguration cfg, AppDbContext db) =>
{
    if (!AdminKeyValid(ctx, cfg))
        return Results.StatusCode(401);

    var playground = await db.Playgrounds.FirstOrDefaultAsync(p => p.Id == id);
    if (playground is null)
        return Results.NotFound(new { error = "Playground not found." });

    var flags = await db.PlaygroundFlags.Where(f => f.PlaygroundId == id).ToListAsync();
    db.PlaygroundFlags.RemoveRange(flags);
    playground.IsHidden = false;
    await db.SaveChangesAsync();

    return Results.Ok(new { status = "restored" });
});

app.MapGet("/admin/hidden-playgrounds", async (HttpContext ctx, IConfiguration cfg, AppDbContext db) =>
{
    if (!AdminKeyValid(ctx, cfg))
        return Results.StatusCode(401);

    var hidden = await db.PlaygroundFlags
        .AsNoTracking()
        .Where(f => f.Playground.IsHidden)
        .Include(f => f.Playground)
        .Include(f => f.User)
        .OrderByDescending(f => f.CreatedAt)
        .Select(f => new
        {
            f.Playground.Id,
            f.Playground.Name,
            f.Playground.Latitude,
            f.Playground.Longitude,
            f.UserId,
            UserName = f.User.Name,
            Reason = f.Reason.ToString(),
            f.ReasonNote,
            f.CreatedAt,
        })
        .ToListAsync();

    return Results.Ok(hidden);
});

app.Run();

static object ToEnrichmentResponse(PlaygroundEnrichment e) => new
{
    Equipment = e.Equipment.Select(eq => eq.ToString()).ToList(),
    AgeSuitability = e.AgeSuitability.Select(a => a.ToString()).ToList(),
    Size = e.Size?.ToString(),
    e.OtherEquipment,
    e.TransportInfo,
    e.Notes,
    e.Reviewed,
};

static async Task<(IResult? Error, List<EquipmentType>? Equipment, List<AgeSuitability>? AgeSuitability, PlaygroundSize? Size)> ValidateEnrichment(
    Guid id, EnrichmentRequest body, AppDbContext db)
{
    if (!await db.Playgrounds.AnyAsync(p => p.Id == id))
        return (Results.NotFound(new { error = "Playground not found." }), null, null, null);

    if (!await db.Users.AnyAsync(u => u.Id == body.UserId))
        return (Results.BadRequest(new { error = "Unknown userId." }), null, null, null);

    if (!string.IsNullOrWhiteSpace(body.TransportInfo) && body.TransportInfo.Trim().Length > 200)
        return (Results.BadRequest(new { error = "transportInfo must be 200 characters or fewer." }), null, null, null);

    if (!string.IsNullOrWhiteSpace(body.Notes) && body.Notes.Trim().Length > 300)
        return (Results.BadRequest(new { error = "notes must be 300 characters or fewer." }), null, null, null);

    var equipment = new List<EquipmentType>();
    foreach (var raw in body.Equipment ?? [])
    {
        if (!Enum.TryParse<EquipmentType>(raw, out var value) || !Enum.IsDefined(value))
            return (Results.BadRequest(new { error = $"Unknown equipment value: {raw}." }), null, null, null);
        equipment.Add(value);
    }

    var ageSuitability = new List<AgeSuitability>();
    foreach (var raw in body.AgeSuitability ?? [])
    {
        if (!Enum.TryParse<AgeSuitability>(raw, out var value) || !Enum.IsDefined(value))
            return (Results.BadRequest(new { error = $"Unknown age suitability value: {raw}." }), null, null, null);
        ageSuitability.Add(value);
    }

    PlaygroundSize? size = null;
    if (!string.IsNullOrEmpty(body.Size))
    {
        if (!Enum.TryParse<PlaygroundSize>(body.Size, out var parsedSize) || !Enum.IsDefined(parsedSize))
            return (Results.BadRequest(new { error = $"Unknown size value: {body.Size}." }), null, null, null);
        size = parsedSize;
    }

    if (!string.IsNullOrWhiteSpace(body.OtherEquipment) && body.OtherEquipment.Trim().Length > 200)
        return (Results.BadRequest(new { error = "otherEquipment must be 200 characters or fewer." }), null, null, null);

    if (equipment.Count == 0
        && ageSuitability.Count == 0
        && size is null
        && string.IsNullOrWhiteSpace(body.OtherEquipment)
        && string.IsNullOrWhiteSpace(body.TransportInfo)
        && string.IsNullOrWhiteSpace(body.Notes))
        return (Results.BadRequest(new { error = "Please add at least one detail before saving." }), null, null, null);

    return (null, equipment, ageSuitability, size);
}

static bool AdminKeyValid(HttpContext ctx, IConfiguration cfg)
{
    var configuredKey = cfg["AdminKey"];
    return !string.IsNullOrEmpty(configuredKey)
        && ctx.Request.Headers.TryGetValue("X-Admin-Key", out var key)
        && key == configuredKey;
}

record EnrichmentRequest(
    Guid UserId,
    string[]? Equipment,
    string[]? AgeSuitability,
    string? Size,
    string? OtherEquipment,
    string? TransportInfo,
    string? Notes);

record FavouriteRequest(Guid UserId);

record SavedRequest(Guid UserId);

record FlagRequest(Guid UserId, string FlagType, string Reason, string? ReasonNote);

record HideRequest(Guid UserId);
