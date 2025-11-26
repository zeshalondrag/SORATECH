using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Product
{
    public int? Id { get; set; }

    public string NameProduct { get; set; } = null!;

    public string Article { get; set; } = null!;

    public string Description { get; set; } = null!;

    public decimal Price { get; set; }

    public int? StockQuantity { get; set; }

    public int CategoryId { get; set; }

    public int SupplierId { get; set; }

    public string? ImageUrl { get; set; }

    public int SalesCount { get; set; }

    public bool Deleted { get; set; }
}