using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class DeliveryType
{
    public int? Id { get; set; }

    public string DeliveryTypeName { get; set; } = null!;

    public string Description { get; set; } = null!;
}