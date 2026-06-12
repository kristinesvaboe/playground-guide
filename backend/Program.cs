using Microsoft.EntityFrameworkCore;
using PlaygroundGuide.Api.Data;
using PlaygroundGuide.Api.Services;

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

builder.Services.AddHttpClient<OsmImportService>(client =>
{
    client.BaseAddress = new Uri("https://overpass-api.de/api/");
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

app.UseCors();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/admin/import/osm", async (HttpRequest request, OsmImportService importService, AppDbContext db) =>
{
    var expectedKey = app.Configuration["AdminKey"];
    if (string.IsNullOrEmpty(expectedKey))
        return Results.StatusCode(503);

    var providedKey = request.Headers["X-Admin-Key"].FirstOrDefault();
    if (string.IsNullOrEmpty(providedKey) || providedKey != expectedKey)
        return Results.Unauthorized();

    var (created, updated) = await importService.ImportRogalandAsync(db);
    return Results.Ok(new { created, updated });
});

app.Run();
