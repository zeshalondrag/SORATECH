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
    /// Контроллер для управления товарами
    /// </summary>
    /// <remarks>
    /// Управление товарами: получение, создание, обновление, удаление товаров
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public ProductsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех товаров
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленные товары в результат (по умолчанию: false)</param>
        /// <returns>Список товаров</returns>
        /// <response code="200">Список товаров успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Product>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Product>>> GetProducts([FromQuery] bool includeDeleted = false)
        {
            var query = _context.Products.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(p => !p.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить товар по ID
        /// </summary>
        /// <param name="id">Идентификатор товара</param>
        /// <param name="includeDeleted">Включать ли удаленные товары (по умолчанию: false)</param>
        /// <returns>Данные товара</returns>
        /// <response code="200">Товар найден</response>
        /// <response code="404">Товар не найден</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<Product>> GetProduct(int? id, [FromQuery] bool includeDeleted = false)
        {
            var product = await _context.Products.FindAsync(id);

            if (product == null)
            {
                return NotFound();
            }

            if (!includeDeleted && product.Deleted)
            {
                return NotFound();
            }

            return product;
        }

        /// <summary>
        /// Обновить данные товара
        /// </summary>
        /// <param name="id">Идентификатор товара</param>
        /// <param name="product">Обновленные данные товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар успешно обновлен</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Товар не найден</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> PutProduct(int? id, Product product)
        {
            if (id != product.Id)
            {
                return BadRequest();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(product).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!ProductExists(id))
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
        /// Создать новый товар
        /// </summary>
        /// <param name="product">Данные нового товара</param>
        /// <returns>Созданный товар</returns>
        /// <response code="201">Товар успешно создан</response>
        /// <response code="400">Некорректные данные</response>
        [HttpPost]
        [ProducesResponseType(typeof(Product), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<Product>> PostProduct(Product product)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.Products.Add(product);
                _context.SetCurrentUserIdFromClaims(User);
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetProduct", new { id = product.Id }, product);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить товар
        /// </summary>
        /// <param name="id">Идентификатор товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар успешно удален</response>
        /// <response code="404">Товар не найден</response>
        /// <response code="400">Ошибка при удалении</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpDelete("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> DeleteProduct(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null || product.Deleted)
                {
                    return NotFound();
                }

                // Логическое удаление
                product.Deleted = true;
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
        /// Физически удалить товар
        /// </summary>
        /// <param name="id">Идентификатор товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Товар успешно удален</response>
        /// <response code="404">Товар не найден</response>
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
        public async Task<IActionResult> HardDeleteProduct(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

                // Физическое удаление
            _context.Products.Remove(product);
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
        /// Восстановить удаленный товар
        /// </summary>
        /// <param name="id">Идентификатор товара</param>
        /// <returns>Восстановленный товар</returns>
        /// <response code="200">Товар успешно восстановлен</response>
        /// <response code="400">Товар не был удален или ошибка при восстановлении</response>
        /// <response code="404">Товар не найден</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(Product), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<Product>> RestoreProduct(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var product = await _context.Products.FindAsync(id);
                if (product == null)
                {
                    return NotFound();
                }

                if (!product.Deleted)
                {
                    return BadRequest(new { message = "Товар не удален" });
                }

                // Восстановление
                product.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(product);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        private bool ProductExists(int? id)
        {
            return _context.Products.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
