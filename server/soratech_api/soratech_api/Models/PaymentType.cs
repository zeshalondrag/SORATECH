using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class PaymentType
{
    public int? Id { get; set; }

    public string PaymentTypeName { get; set; } = null!;

    public string Description { get; set; } = null!;
}