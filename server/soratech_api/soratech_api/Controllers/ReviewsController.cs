using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления отзывами на товары
    /// </summary>
    /// <remarks>
    /// Управление отзывами: получение, создание, обновление, удаление отзывов. 
    /// Пользователи могут оставлять отзывы только на товары, которые они приобрели и получили.
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public ReviewsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех отзывов
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленные отзывы в результат (по умолчанию: false)</param>
        /// <returns>Список отзывов</returns>
        /// <response code="200">Список отзывов успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Review>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Review>>> GetReviews([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Reviews.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(r => !r.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить отзыв по ID
        /// </summary>
        /// <param name="id">Идентификатор отзыва</param>
        /// <param name="includeDeleted">Включать ли удаленные отзывы (по умолчанию: false)</param>
        /// <returns>Данные отзыва</returns>
        /// <response code="200">Отзыв найден</response>
        /// <response code="404">Отзыв не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Review), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Review>> GetReview(int? id, [FromQuery] bool includeDeleted = false)
        {
            var review = await _context.Reviews.FindAsync(id);

            if (review == null)
            {
                return NotFound();
            }

            if (!includeDeleted && review.Deleted)
            {
                return NotFound();
            }

            return review;
        }

        /// <summary>
        /// Обновить отзыв
        /// </summary>
        /// <param name="id">Идентификатор отзыва</param>
        /// <param name="review">Обновленные данные отзыва</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Отзыв успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Отзыв не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutReview(int? id, Review review)
        {
            if (id != review.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(review).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!ReviewExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при обновлении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Создать новый отзыв на товар
        /// </summary>
        /// <param name="review">Данные нового отзыва</param>
        /// <returns>Созданный отзыв</returns>
        /// <response code="201">Отзыв успешно создан</response>
        /// <response code="400">Некорректные данные (товар не найден, недостаточно прав для отзыва, рейтинг вне диапазона 1-5)</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="409">Отзыв на этот товар уже существует</response>
        /// <remarks>
        /// Пользователь может оставить отзыв только на товар, который он приобрел и получил (статус заказа "Доставлен").
        /// На один товар можно оставить только один отзыв. Рейтинг должен быть от 1 до 5.
        /// </remarks>
        [HttpPost]
        [ProducesResponseType(typeof(Review), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        [Authorize]
        public async Task<ActionResult<Review>> PostReview(Review review)
        {
            // Получаем ID текущего пользователя из JWT токена
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
            {
                return Unauthorized(new { message = "Не удалось определить пользователя" });
            }

            // Проверяем, что товар существует и не удален
            var product = await _context.Products.FindAsync(review.ProductId);
            if (product == null || product.Deleted)
            {
                return NotFound(new { message = $"Товар с ID {review.ProductId} не найден" });
            }

            // ✅ ПРОВЕРКА: Купил ли пользователь этот товар?
            // Проверяем наличие заказов пользователя с этим товаром со статусом "Доставлен"
            var hasPurchasedProduct = await _context.Orders
                .Where(o => o.UserId == currentUserId)
                .Where(o => o.StatusOrderId == 4) // Статус "Доставлен" (можно вынести в константу или переменную)
                .Where(o => o.OrderItems.Any(oi => oi.ProductId == review.ProductId))
                .AnyAsync();

            if (!hasPurchasedProduct)
            {
                return BadRequest(new { 
                    message = "Вы можете оставить отзыв только на товар, который вы приобрели и получили" 
                });
            }

            // Проверяем, не оставлял ли пользователь уже отзыв на этот товар (не удаленный)
            var existingReview = await _context.Reviews
                .Where(r => r.UserId == currentUserId && r.ProductId == review.ProductId && !r.Deleted)
                .FirstOrDefaultAsync();

            if (existingReview != null)
            {
                return Conflict(new { 
                    message = "Вы уже оставили отзыв на этот товар. Используйте PUT для обновления отзыва" 
                });
            }

            // Валидация рейтинга (1-5)
            if (review.Rating < 1 || review.Rating > 5)
            {
                return BadRequest(new { message = "Рейтинг должен быть от 1 до 5" });
            }

            // Устанавливаем дату отзыва (если не установлена)
            if (review.ReviewDate == default(DateOnly))
            {
                review.ReviewDate = DateOnly.FromDateTime(DateTime.Now);
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.Reviews.Add(review);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetReview", new { id = review.Id }, review);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить отзыв
        /// </summary>
        /// <param name="id">Идентификатор отзыва</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Отзыв успешно удален</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (можно удалить только свой отзыв)</response>
        /// <response code="404">Отзыв не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <remarks>
        /// Пользователь может удалить только свой отзыв. Администраторы и менеджеры могут удалять любые отзывы.
        /// </remarks>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [Authorize]
        public async Task<IActionResult> DeleteReview(int? id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null || review.Deleted)
            {
                return NotFound();
            }

            // Проверяем права: только владелец отзыва или администратор может удалить
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var roleClaim = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
            {
                return Unauthorized(new { message = "Не удалось определить пользователя" });
            }

            bool isAdmin = roleClaim == "Администратор" || roleClaim == "Менеджер";
            if (review.UserId != currentUserId && !isAdmin)
            {
                return Forbid("Вы можете удалить только свой отзыв");
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Логическое удаление
                review.Deleted = true;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при удалении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Физически удалить отзыв
        /// </summary>
        /// <param name="id">Идентификатор отзыва</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Отзыв успешно удален</response>
        /// <response code="404">Отзыв не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpDelete("{id}/hard")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> HardDeleteReview(int? id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null)
            {
                return NotFound();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Физическое удаление
            _context.Reviews.Remove(review);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return NoContent();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при удалении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Восстановить удаленный отзыв
        /// </summary>
        /// <param name="id">Идентификатор отзыва</param>
        /// <returns>Восстановленный отзыв</returns>
        /// <response code="200">Отзыв успешно восстановлен</response>
        /// <response code="400">Отзыв не был удален или ошибка при восстановлении</response>
        /// <response code="404">Отзыв не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(Review), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Review>> RestoreReview(int? id)
        {
            var review = await _context.Reviews.FindAsync(id);
            if (review == null)
            {
                return NotFound();
            }

            if (!review.Deleted)
            {
                return BadRequest(new { message = "Отзыв не удален" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                // Восстановление
                review.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(review);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        /// <summary>
        /// Проверить возможность оставить отзыв на товар
        /// </summary>
        /// <param name="productId">Идентификатор товара</param>
        /// <returns>Информация о возможности оставить отзыв</returns>
        /// <response code="200">Проверка выполнена успешно</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="404">Товар не найден</response>
        /// <remarks>
        /// Возвращает информацию о том, может ли пользователь оставить отзыв на товар:
        /// - canReview: может ли пользователь оставить отзыв
        /// - hasPurchased: купил ли пользователь товар
        /// - hasExistingReview: есть ли уже отзыв от этого пользователя
        /// </remarks>
        [HttpGet("check/{productId}")]
        [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [Authorize]
        public async Task<ActionResult> CheckReviewEligibility(int productId)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int currentUserId))
            {
                return Unauthorized(new { message = "Не удалось определить пользователя" });
            }

            // Проверяем наличие товара и что он не удален
            var product = await _context.Products.FindAsync(productId);
            if (product == null || product.Deleted)
            {
                return NotFound(new { message = $"Товар с ID {productId} не найден" });
            }

            // Проверяем, купил ли пользователь товар
            var hasPurchased = await _context.Orders
                .Where(o => o.UserId == currentUserId)
                .Where(o => o.StatusOrderId == 4) // Статус "Доставлен"
                .Where(o => o.OrderItems.Any(oi => oi.ProductId == productId))
                .AnyAsync();

            // Проверяем, есть ли уже отзыв (не удаленный)
            var hasExistingReview = await _context.Reviews
                .Where(r => r.UserId == currentUserId && r.ProductId == productId && !r.Deleted)
                .AnyAsync();

            return Ok(new
            {
                canReview = hasPurchased && !hasExistingReview,
                hasPurchased = hasPurchased,
                hasExistingReview = hasExistingReview
            });
        }

        private bool ReviewExists(int? id)
        {
            return _context.Reviews.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
