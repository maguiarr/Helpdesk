using FluentValidation;
using FluentValidation.AspNetCore;
using HelpDeskApi.Data;
using HelpDeskApi.Mapping;
using HelpDeskApi.Middleware;
using HelpDeskApi.Repositories;
using HelpDeskApi.Services;
using System.Security.Claims;
using System.Text.Json;
using Keycloak.AuthServices.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Database
var connectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING")
    ?? throw new InvalidOperationException("CONNECTION_STRING environment variable is required");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// Keycloak Authentication
builder.Services.AddKeycloakWebApiAuthentication(builder.Configuration, options =>
{
    // In Docker Compose the token issuer uses localhost but JWKS must be fetched
    // from the internal network hostname. MetadataAddress overrides discovery URL.
    var metadataAddress = builder.Configuration["Keycloak:MetadataAddress"];
    if (!string.IsNullOrEmpty(metadataAddress))
    {
        options.MetadataAddress = metadataAddress;
        options.RequireHttpsMetadata = false;
    }
});

// Audience validation is skipped — the frontend PKCE token targets the backend
// via an audience mapper; signature + issuer validation is sufficient for this demo.
builder.Services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.TokenValidationParameters.ValidateAudience = false;

    // The browser obtains tokens from Keycloak via localhost (issuer = localhost:8180),
    // but the backend fetches OIDC metadata via the Docker-internal hostname (keycloak:8180).
    // Accept both issuers so tokens from either context validate correctly.
    var authority = builder.Configuration["Keycloak:Authority"];
    var metadataAddress = builder.Configuration["Keycloak:MetadataAddress"];
    if (!string.IsNullOrEmpty(authority) && !string.IsNullOrEmpty(metadataAddress))
    {
        // Extract the issuer base from MetadataAddress (strip /.well-known/...)
        var internalIssuer = metadataAddress.Replace("/.well-known/openid-configuration", "");
        options.TokenValidationParameters.ValidIssuers = new[] { authority, internalIssuer };
    }
});

builder.Services.AddAuthorization();
builder.Services.AddTransient<IClaimsTransformation, KeycloakRolesClaimsTransformation>();

// DI
builder.Services.AddScoped<ITicketRepository, TicketRepository>();
builder.Services.AddScoped<ITicketService, TicketService>();

// AutoMapper
builder.Services.AddAutoMapper(typeof(MappingProfile));

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
var keycloakAuthority = builder.Configuration["Keycloak:Authority"]
    ?? throw new InvalidOperationException("Keycloak:Authority configuration is required");

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "HelpDesk API", Version = "v1" });
    c.AddSecurityDefinition("oauth2", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.OAuth2,
        Flows = new OpenApiOAuthFlows
        {
            AuthorizationCode = new OpenApiOAuthFlow
            {
                AuthorizationUrl = new Uri($"{keycloakAuthority}/protocol/openid-connect/auth"),
                TokenUrl = new Uri($"{keycloakAuthority}/protocol/openid-connect/token")
            }
        }
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "oauth2" }
            },
            Array.Empty<string>()
        }
    });
});

// Health Checks
builder.Services.AddHealthChecks()
    .AddNpgSql(connectionString, name: "database");

// CORS for Development
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy.WithOrigins("http://localhost:4200")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

var app = builder.Build();

// Auto-migrate
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

// Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.OAuthClientId("helpdesk-frontend");
    c.OAuthUsePkce();
});

if (app.Environment.IsDevelopment())
{
    app.UseCors();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Health check endpoints
app.MapHealthChecks("/healthz", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = _ => false // liveness: always healthy if process is running
});
app.MapHealthChecks("/readyz", new Microsoft.AspNetCore.Diagnostics.HealthChecks.HealthCheckOptions
{
    Predicate = check => check.Name == "database"
});

app.Run();

public class KeycloakRolesClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = principal.Identity as ClaimsIdentity;
        if (identity is null) return Task.FromResult(principal);

        var realmAccess = principal.FindFirst("realm_access")?.Value;
        if (realmAccess is null) return Task.FromResult(principal);

        using var doc = JsonDocument.Parse(realmAccess);
        if (doc.RootElement.TryGetProperty("roles", out var roles))
        {
            foreach (var role in roles.EnumerateArray())
            {
                var value = role.GetString();
                if (value is not null && !identity.HasClaim(identity.RoleClaimType, value))
                {
                    identity.AddClaim(new Claim(identity.RoleClaimType, value));
                }
            }
        }

        return Task.FromResult(principal);
    }
}
