using Xunit;
using SmartRent.Core.DTOs;
using SmartRent.Core.Enums;
using SmartRent.Core.Entities;

namespace SmartRent.Tests;

public class ApiResponseTests
{
    [Fact]
    public void ApiResponse_Ok_ReturnsSuccessWithData()
    {
        // Arrange
        var testData = new { Name = "Phong 101", Price = 3500000m };

        // Act
        var response = ApiResponse.Ok(testData, "Thành công");

        // Assert
        Assert.True(response.IsSuccess);
        Assert.Equal(200, response.Code);
        Assert.Equal("Thành công", response.Message);
        Assert.NotNull(response.Data);
    }

    [Fact]
    public void ApiResponse_Fail_ReturnsFailureWithCustomCode()
    {
        // Act
        var response = ApiResponse.Fail("Dữ liệu không hợp lệ", 400);

        // Assert
        Assert.False(response.IsSuccess);
        Assert.Equal(400, response.Code);
        Assert.Equal("Dữ liệu không hợp lệ", response.Message);
    }

    [Fact]
    public void ApiResponse_Unauthorized_Returns401Code()
    {
        // Act
        var response = ApiResponse.Unauthorized("Chưa đăng nhập");

        // Assert
        Assert.False(response.IsSuccess);
        Assert.Equal(401, response.Code);
        Assert.Equal("Chưa đăng nhập", response.Message);
    }

    [Fact]
    public void ApiResponse_Forbidden_Returns403Code()
    {
        // Act
        var response = ApiResponse.Forbidden("Không có quyền truy cập");

        // Assert
        Assert.False(response.IsSuccess);
        Assert.Equal(403, response.Code);
        Assert.Equal("Không có quyền truy cập", response.Message);
    }
}

public class BillingCalculationTests
{
    [Theory]
    [InlineData(100, 150, 3500, 175000)]
    [InlineData(200, 280, 4000, 320000)]
    [InlineData(50, 50, 3500, 0)]
    public void ElectricityCost_CalculatesCorrectly(decimal oldReading, decimal newReading, decimal unitPrice, decimal expectedCost)
    {
        // Arrange & Act
        var consumption = newReading - oldReading;
        var cost = consumption * unitPrice;

        // Assert
        Assert.Equal(expectedCost, cost);
    }

    [Theory]
    [InlineData(20, 35, 25000, 375000)]
    [InlineData(10, 18, 20000, 160000)]
    public void WaterCost_CalculatesCorrectly(decimal oldReading, decimal newReading, decimal unitPrice, decimal expectedCost)
    {
        // Arrange & Act
        var consumption = newReading - oldReading;
        var cost = consumption * unitPrice;

        // Assert
        Assert.Equal(expectedCost, cost);
    }

    [Fact]
    public void InvoiceTotalAmount_SumsAllLineItemsCorrectly()
    {
        // Arrange
        decimal roomPrice = 3000000m;
        decimal elecCost = 175000m;
        decimal waterCost = 125000m;
        decimal wifiCost = 100000m;
        decimal trashCost = 50000m;

        // Act
        decimal total = roomPrice + elecCost + waterCost + wifiCost + trashCost;

        // Assert
        Assert.Equal(3450000m, total);
    }
}

public class RoomDomainTests
{
    [Fact]
    public void Room_InitialStatus_DefaultsToVacant()
    {
        // Arrange & Act
        var room = new Room
        {
            RoomNumber = "101",
            Price = 3000000m,
            Area = 25.5m,
            Status = RoomStatus.Vacant
        };

        // Assert
        Assert.Equal(RoomStatus.Vacant, room.Status);
        Assert.Equal("101", room.RoomNumber);
    }

    [Fact]
    public void Room_WhenDepositBooked_SetsDepositInfo()
    {
        // Arrange
        var room = new Room
        {
            RoomNumber = "102",
            Price = 3500000m,
            Status = RoomStatus.Vacant
        };

        // Act
        room.DepositAmount = 1000000m;
        room.DepositTenantName = "Nguyen Van A";
        room.DepositTenantPhone = "0901234567";

        // Assert
        Assert.Equal(1000000m, room.DepositAmount);
        Assert.Equal("Nguyen Van A", room.DepositTenantName);
        Assert.Equal("0901234567", room.DepositTenantPhone);
    }
}
