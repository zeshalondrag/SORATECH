using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Characteristic
{
    public int? Id { get; set; }

    public string NameCharacteristic { get; set; } = null!;

    public string Description { get; set; } = null!;

    public bool Deleted { get; set; }
}