using Microsoft.EntityFrameworkCore;
using NetTopologySuite.Geometries;
using PlaygroundGuide.Api.Data;

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

app.MapGet("/playgrounds", async (double? lat, double? lng, double? radius, AppDbContext db) =>
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
        .Where(p => p.Location.IsWithinDistance(centre, radiusDegrees))
        .Select(p => new { p.Id, p.Name, p.Latitude, p.Longitude })
        .Take(200)
        .ToListAsync();

    return Results.Ok(playgrounds);
});
