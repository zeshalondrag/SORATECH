using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using soratech_api.Models;
using soratech_api.Extensions;

namespace soratech_api.Controllers
{
    /// <summary>
    /// Контроллер для управления избранными товарами
    /// </summary>
    /// <remarks>
    /// Управление избранными товарами: получение, создание, обновление, удаление избранных товаров пользователя
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class FavoritesController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public FavoritesController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех избранных товаров
        /// </summary>
        /// <returns>Список избранных товаров</returns>
        /// <response code="200">Список избранных товаров успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Favorite>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Favorite>>> GetFavorites()
        {
            return await _context.Favorites.ToListAsync();
        }

        /// <summary>
        /// Получить избранный товар по ID
        /// </summary>
        /// <param name="id">Идентификатор записи избранного</param>
        /// <returns>Данные избранного товара</returns>
        /// <response code="200">Избранный товар найден</response>
        /// <response code="404">Избранный товар не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Favorite), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Favorite>> GetFavorite(int? id)
        {
            var favorite = await _context.Favorites.FindAsync(id);

            if (favorite == null)
            {
                return NotFound();
            }

            return favorite;
        }

        /// <summary>
        /// Обновить избранный товар
        /// </summary>
        /// <param name="id">Идентификатор записи избранного</param>
        /// <param name="favorite">Обновленные данные избранного товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Избранный товар успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Избранный товар не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutFavorite(int? id, Favorite favorite)
        {
            if (id != favorite.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(favorite).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!FavoriteExists(id))
                {
                    return NotFound(new { message = "Избранный товар не найден" });
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
        /// Добавить товар в избранное
        /// </summary>
        /// <param name="favorite">Данные товара для добавления в избранное</param>
        /// <returns>Созданная запись избранного</returns>
        /// <response code="201">Товар успешно добавлен в избранное</response>
        /// <response code="400">Некорректные данные</response>
        [HttpPost]
        [ProducesResponseType(typeof(Favorite), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Favorite>> PostFavorite(Favorite favorite)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                _context.Favorites.Add(favorite);
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return CreatedAtAction("GetFavorite", new { id = favorite.Id }, favorite);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Удалить товар из избранного
        /// </summary>
        /// <param name="id">Идентификатор записи избранного</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар успешно удален из избранного</response>
        /// <response code="404">Избранный товар не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> DeleteFavorite(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var favorite = await _context.Favorites.FindAsync(id);
                if (favorite == null)
                {
                    return NotFound(new { message = "Избранный товар не найден" });
                }

                _context.Favorites.Remove(favorite);
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

        private bool FavoriteExists(int? id)
        {
            return _context.Favorites.Any(e => e.Id == id);
        }
    }
}
