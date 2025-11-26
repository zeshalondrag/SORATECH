using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class ProductCharacteristic
{
    public int? Id { get; set; }

    public int ProductId { get; set; }

    public int CharacteristicId { get; set; }

    public string Description { get; set; } = null!;

    public bool Deleted { get; set; }
}