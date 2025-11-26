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
    /// Контроллер для управления категориями товаров
    /// </summary>
    /// <remarks>
    /// Управление категориями: получение, создание, обновление, удаление категорий товаров
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public CategoriesController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех категорий
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленные категории в результат (по умолчанию: false)</param>
        /// <returns>Список категорий</returns>
        /// <response code="200">Список категорий успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Category>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<Category>>> GetCategories([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Categories.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(c => !c.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить категорию по ID
        /// </summary>
        /// <param name="id">Идентификатор категории</param>
        /// <param name="includeDeleted">Включать ли удаленные категории (по умолчанию: false)</param>
        /// <returns>Данные категории</returns>
        /// <response code="200">Категория найдена</response>
        /// <response code="404">Категория не найдена</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Category), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<Category>> GetCategory(int? id, [FromQuery] bool includeDeleted = false)
        {
            var category = await _context.Categories.FindAsync(id);

            if (category == null)
            {
                return NotFound();
            }

            if (!includeDeleted && category.Deleted)
            {
                return NotFound();
            }

            return category;
        }

        /// <summary>
        /// Обновить данные категории
        /// </summary>
        /// <param name="id">Идентификатор категории</param>
        /// <param name="category">Обновленные данные категории</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Категория успешно обновлена</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Категория не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> PutCategory(int? id, Category category)
        {
            if (id != category.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(category).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!CategoryExists(id))
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
        /// Создать новую категорию
        /// </summary>
        /// <param name="category">Данные новой категории</param>
        /// <returns>Созданная категория</returns>
        /// <response code="201">Категория успешно создана</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost]
        [ProducesResponseType(typeof(Category), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<Category>> PostCategory(Category category)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.Categories.Add(category);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetCategory", new { id = category.Id }, category);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить категорию
        /// </summary>
        /// <param name="id">Идентификатор категории</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Категория успешно удалена</response>
        /// <response code="404">Категория не найдена</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<IActionResult> DeleteCategory(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null || category.Deleted)
                {
                    return NotFound();
                }

                // Логическое удаление
                category.Deleted = true;
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
        /// Физически удалить категорию
        /// </summary>
        /// <param name="id">Идентификатор категории</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Категория успешно удалена</response>
        /// <response code="404">Категория не найдена</response>
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
        public async Task<IActionResult> HardDeleteCategory(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

                // Физическое удаление
            _context.Categories.Remove(category);
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
        /// Восстановить удаленную категорию
        /// </summary>
        /// <param name="id">Идентификатор категории</param>
        /// <returns>Восстановленная категория</returns>
        /// <response code="200">Категория успешно восстановлена</response>
        /// <response code="400">Категория не была удалена или ошибка при восстановлении</response>
        /// <response code="404">Категория не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(Category), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор")]
        public async Task<ActionResult<Category>> RestoreCategory(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                {
                    return NotFound();
                }

                if (!category.Deleted)
                {
                    return BadRequest(new { message = "Категория не удалена" });
                }

                // Восстановление
                category.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(category);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        private bool CategoryExists(int? id)
        {
            return _context.Categories.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
