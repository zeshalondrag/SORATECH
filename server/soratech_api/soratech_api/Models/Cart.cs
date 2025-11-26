using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Cart
{
    public int? Id { get; set; }

    public int UserId { get; set; }

    public int ProductId { get; set; }

    public int Quantity { get; set; }

    public DateTime? AddedAt { get; set; }
}