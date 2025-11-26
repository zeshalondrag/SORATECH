using System;
using System.Collections.Generic;

namespace soratech_api.Models;

public partial class Review
{
    public int? Id { get; set; }

    public int ProductId { get; set; }

    public int UserId { get; set; }

    public decimal Rating { get; set; }

    public string? CommentText { get; set; }

    public DateOnly ReviewDate { get; set; }

    public bool Deleted { get; set; }
}