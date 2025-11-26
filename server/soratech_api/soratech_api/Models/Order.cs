using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Order
{
    public int? Id { get; set; }

    public string OrderNumber { get; set; } = null!;

    public int UserId { get; set; }

    public DateTime OrderDate { get; set; }

    public decimal TotalAmount { get; set; }

    public int StatusOrderId { get; set; }

    public int? AddressId { get; set; }

    public int DeliveryTypesId { get; set; }

    public int PaymentTypesId { get; set; }

    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
}