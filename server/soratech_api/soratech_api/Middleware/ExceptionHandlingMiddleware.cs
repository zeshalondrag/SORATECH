using System.Net;
using System.Text.Json;

namespace soratech_api.Middleware;

/// <summary>
/// Глобальный обработчик исключений для API
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Произошла ошибка при обработке запроса: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var code = HttpStatusCode.InternalServerError;
        var message = "Произошла внутренняя ошибка сервера";
        var details = (string?)null;

        // Обработка различных типов исключений
        switch (exception)
        {
            case UnauthorizedAccessException:
                code = HttpStatusCode.Unauthorized;
                message = "Доступ запрещен";
                details = exception.Message;
                break;

            case ArgumentNullException argEx:
                code = HttpStatusCode.BadRequest;
                message = "Отсутствует обязательный параметр";
                details = argEx.ParamName != null ? $"Параметр '{argEx.ParamName}' не может быть null" : argEx.Message;
                break;

            case ArgumentException argEx:
                code = HttpStatusCode.BadRequest;
                message = "Некорректный параметр";
                details = argEx.Message;
                break;

            case KeyNotFoundException:
                code = HttpStatusCode.NotFound;
                message = "Запрашиваемый ресурс не найден";
                details = exception.Message;
                break;

            case InvalidOperationException:
                code = HttpStatusCode.BadRequest;
                message = "Недопустимая операция";
                details = exception.Message;
                break;

            case Microsoft.EntityFrameworkCore.DbUpdateException dbEx:
                code = HttpStatusCode.BadRequest;
                message = "Ошибка при работе с базой данных";
                details = dbEx.InnerException?.Message ?? dbEx.Message;
                break;

            case TimeoutException:
                code = HttpStatusCode.RequestTimeout;
                message = "Превышено время ожидания операции";
                break;

            default:
                // Для неизвестных исключений в режиме разработки показываем детали
                if (context.RequestServices.GetService<IWebHostEnvironment>()?.IsDevelopment() == true)
                {
                    details = exception.ToString();
                }
                break;
        }

        var response = new
        {
            error = new
            {
                message = message,
                details = details,
                statusCode = (int)code,
                timestamp = DateTime.UtcNow
            }
        };

        var jsonResponse = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)code;

        return context.Response.WriteAsync(jsonResponse);
    }
}

