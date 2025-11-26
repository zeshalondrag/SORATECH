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
    /// Контроллер для управления характеристиками товаров
    /// </summary>
    /// <remarks>
    /// Управление связями товаров и их характеристик: получение, создание, обновление, удаление характеристик товаров
    /// </remarks>
    [Route("api/[controller]")]
    [ApiController]
    public class ProductCharacteristicsController : ControllerBase
    {
        private readonly SoraTechDbContext _context;

        public ProductCharacteristicsController(SoraTechDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Получить список всех характеристик товаров
        /// </summary>
        /// <param name="includeDeleted">Включать ли удаленные записи в результат (по умолчанию: false)</param>
        /// <returns>Список характеристик товаров</returns>
        /// <response code="200">Список характеристик товаров успешно получен</response>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<ProductCharacteristic>), StatusCodes.Status200OK)]
        [AllowAnonymous]
        public async Task<ActionResult<IEnumerable<ProductCharacteristic>>> GetProductCharacteristics([FromQuery] bool includeDeleted = false)
        {
            var query = _context.ProductCharacteristics.AsQueryable();
            
            if (!includeDeleted)
            {
                query = query.Where(pc => !pc.Deleted);
            }

            return await query.ToListAsync();
        }

        /// <summary>
        /// Получить характеристику товара по ID
        /// </summary>
        /// <param name="id">Идентификатор характеристики товара</param>
        /// <param name="includeDeleted">Включать ли удаленные записи (по умолчанию: false)</param>
        /// <returns>Данные характеристики товара</returns>
        /// <response code="200">Характеристика товара найдена</response>
        /// <response code="404">Характеристика товара не найдена</response>
        [HttpGet("{id}")]
        [ProducesResponseType(typeof(ProductCharacteristic), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [AllowAnonymous]
        public async Task<ActionResult<ProductCharacteristic>> GetProductCharacteristic(int? id, [FromQuery] bool includeDeleted = false)
        {
            var productCharacteristic = await _context.ProductCharacteristics.FindAsync(id);

            if (productCharacteristic == null)
            {
                return NotFound();
            }

            if (!includeDeleted && productCharacteristic.Deleted)
            {
                return NotFound();
            }

            return productCharacteristic;
        }

        /// <summary>
        /// Обновить характеристику товара
        /// </summary>
        /// <param name="id">Идентификатор характеристики товара</param>
        /// <param name="productCharacteristic">Обновленные данные характеристики товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика товара успешно обновлена</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="404">Характеристика товара не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPut("{id}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<IActionResult> PutProductCharacteristic(int? id, ProductCharacteristic productCharacteristic)
        {
            if (id != productCharacteristic.Id)
            {
                return BadRequest(new { message = "Идентификатор в URL не совпадает с идентификатором в теле запроса" });
            }

            using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                _context.Entry(productCharacteristic).State = EntityState.Modified;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return NoContent();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                if (!ProductCharacteristicExists(id))
                {
                    return NotFound(new { message = "Характеристика товара не найдена" });
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
        /// Создать новую характеристику товара
        /// </summary>
        /// <param name="productCharacteristic">Данные новой характеристики товара</param>
        /// <returns>Созданная характеристика товара</returns>
        /// <response code="201">Характеристика товара успешно создана</response>
        /// <response code="400">Некорректные данные</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost]
        [ProducesResponseType(typeof(ProductCharacteristic), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<ProductCharacteristic>> PostProductCharacteristic(ProductCharacteristic productCharacteristic)
        {
            // Используем явную транзакцию для обеспечения правильной работы переменной сессии
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
        {
            _context.ProductCharacteristics.Add(productCharacteristic);
                
                // Устанавливаем user_id для аудита ВНУТРИ транзакции
                _context.SetCurrentUserIdFromClaims(User);
                
            await _context.SaveChangesAsync();
                await transaction.CommitAsync();

            return CreatedAtAction("GetProductCharacteristic", new { id = productCharacteristic.Id }, productCharacteristic);
        }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при создании: {ex.Message}" });
            }
        }

        /// <summary>
        /// Логически удалить характеристику товара
        /// </summary>
        /// <param name="id">Идентификатор характеристики товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика товара успешно удалена</response>
        /// <response code="404">Характеристика товара не найдена</response>
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
        public async Task<IActionResult> DeleteProductCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var productCharacteristic = await _context.ProductCharacteristics.FindAsync(id);
                if (productCharacteristic == null || productCharacteristic.Deleted)
                {
                    return NotFound(new { message = "Характеристика товара не найдена" });
                }

                // Логическое удаление
                productCharacteristic.Deleted = true;
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
        /// Физически удалить характеристику товара
        /// </summary>
        /// <param name="id">Идентификатор характеристики товара</param>
        /// <returns>Результат операции</returns>
        /// <response code="204">Характеристика товара успешно удалена</response>
        /// <response code="404">Характеристика товара не найдена</response>
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
        public async Task<IActionResult> HardDeleteProductCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var productCharacteristic = await _context.ProductCharacteristics.FindAsync(id);
                if (productCharacteristic == null)
                {
                    return NotFound(new { message = "Характеристика товара не найдена" });
                }

                // Физическое удаление
            _context.ProductCharacteristics.Remove(productCharacteristic);
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
        /// Восстановить удаленную характеристику товара
        /// </summary>
        /// <param name="id">Идентификатор характеристики товара</param>
        /// <returns>Восстановленная характеристика товара</returns>
        /// <response code="200">Характеристика товара успешно восстановлена</response>
        /// <response code="400">Характеристика товара не была удалена или ошибка при восстановлении</response>
        /// <response code="404">Характеристика товара не найдена</response>
        /// <response code="401">Не авторизован</response>
        /// <response code="403">Недостаточно прав (требуется роль Администратор или Менеджер)</response>
        [HttpPost("{id}/restore")]
        [ProducesResponseType(typeof(ProductCharacteristic), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [Authorize(Roles = "Администратор, Менеджер")]
        public async Task<ActionResult<ProductCharacteristic>> RestoreProductCharacteristic(int? id)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            
            try
            {
                var productCharacteristic = await _context.ProductCharacteristics.FindAsync(id);
                if (productCharacteristic == null)
                {
                    return NotFound(new { message = "Характеристика товара не найдена" });
                }

                if (!productCharacteristic.Deleted)
                {
                    return BadRequest(new { message = "Характеристика товара не удалена" });
                }

                // Восстановление
                productCharacteristic.Deleted = false;
                _context.SetCurrentUserIdFromClaims(User);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(productCharacteristic);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest(new { message = $"Ошибка при восстановлении: {ex.Message}" });
            }
        }

        private bool ProductCharacteristicExists(int? id)
        {
            return _context.ProductCharacteristics.Any(e => e.Id == id && !e.Deleted);
        }
    }
}
