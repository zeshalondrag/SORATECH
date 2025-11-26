using DotNetEnv;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using soratech_api.Middleware;
using soratech_api.Models;
using System.Reflection;
using System.Text;

Env.Load();

var connectionString =
    $"Host={Env.GetString("DB_HOST")};" +
    $"Port={Env.GetString("DB_PORT")};" +
    $"Database={Env.GetString("DB_NAME")};" +
    $"Username={Env.GetString("DB_USER")};" +
    $"Password={Env.GetString("DB_PASSWORD")};";

var jwtKey = Env.GetString("JWT_KEY");

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<soratech_api.Models.SoraTechDbContext>(x =>
    x.UseNpgsql(builder.Configuration.GetConnectionString("con")));

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = "SoraTechApi",
        ValidAudience = "SoraTechApi",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "SORATECH API",
        Version = "v1",
        Description = "RESTful API для управления интернет-магазином SORATECH. " +
                      "API предоставляет полный функционал для работы с товарами, заказами, пользователями, отзывами и другими сущностями системы.",
        Contact = new OpenApiContact
        {
            Name = "Александр",
            Email = "sanyayt1337@gmail.com"
        },
        License = new OpenApiLicense
        {
            Name = "MIT License"
        }
    });
    
    // Включаем XML комментарии для Swagger
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        c.IncludeXmlComments(xmlPath);
    }
    
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "JWT токен авторизации. Формат: Bearer {token}",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// Глобальный обработчик исключений (должен быть первым в цепочке middleware)
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseAuthentication();

app.UseAuthorization();

app.MapControllers();

app.Run();