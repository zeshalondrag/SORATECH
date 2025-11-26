using soratech_api.Models;
using System.Security.Claims;

namespace soratech_api.Extensions;

public static class DbContextExtensions
{
    /// <summary>
    /// Устанавливает user_id для аудита из JWT токена
    /// </summary>
    public static void SetCurrentUserIdFromClaims(this SoraTechDbContext context, ClaimsPrincipal? user)
    {
        if (user == null)
        {
            context.SetCurrentUserId(null);
            return;
        }

        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrEmpty(userIdClaim) && int.TryParse(userIdClaim, out int userId))
        {
            context.SetCurrentUserId(userId);
        }
        else
        {
            context.SetCurrentUserId(null);
        }
    }
}
