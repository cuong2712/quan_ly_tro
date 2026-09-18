using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using SmartRent.Application.Services;
using Xunit;

namespace SmartRent.Tests;

public class TelegramBotServiceTests
{
    [Fact]
    public async Task SendMessageToAdminAsync_WhenDisabled_ReturnsFalse()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Telegram:BotToken", "dummy_token" },
            { "Telegram:AdminChatId", "123456" },
            { "Telegram:IsEnabled", "false" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var service = new TelegramBotService(httpClient, configuration, NullLogger<TelegramBotService>.Instance);

        // Act
        var result = await service.SendMessageToAdminAsync("Hello");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task SendMessageToAdminAsync_WhenTokenMissing_ReturnsFalse()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Telegram:BotToken", "" },
            { "Telegram:AdminChatId", "123456" },
            { "Telegram:IsEnabled", "true" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var service = new TelegramBotService(httpClient, configuration, NullLogger<TelegramBotService>.Instance);

        // Act
        var result = await service.SendMessageToAdminAsync("Hello");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task SendAdminNotificationAsync_WhenDisabled_DoesNotThrowAndReturnsFalse()
    {
        // Arrange
        var inMemorySettings = new Dictionary<string, string?>
        {
            { "Telegram:IsEnabled", "false" }
        };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var httpClient = new HttpClient();
        var service = new TelegramBotService(httpClient, configuration, NullLogger<TelegramBotService>.Instance);

        // Act
        var result = await service.SendAdminNotificationAsync("Test Title", "Test Content", "Nguyen Van A");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task SendComplaintAlertAsync_WhenDisabled_DoesNotThrowAndReturnsFalse()
    {
        var inMemorySettings = new Dictionary<string, string?> { { "Telegram:IsEnabled", "false" } };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var service = new TelegramBotService(new HttpClient(), configuration, NullLogger<TelegramBotService>.Instance);

        var result = await service.SendComplaintAlertAsync("Khach A", "Tenant", "a@gmail.com", "Tiêu đề", "Nội dung");
        Assert.False(result);
    }

    [Fact]
    public async Task SendReplyAlertAsync_WhenDisabled_DoesNotThrowAndReturnsFalse()
    {
        var inMemorySettings = new Dictionary<string, string?> { { "Telegram:IsEnabled", "false" } };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var service = new TelegramBotService(new HttpClient(), configuration, NullLogger<TelegramBotService>.Instance);

        var result = await service.SendReplyAlertAsync("Khach A", "Tiêu đề", "Phản hồi", "Ban Quản Trị");
        Assert.False(result);
    }

    [Fact]
    public async Task SendInvoiceDisputeAlertAsync_WhenDisabled_DoesNotThrowAndReturnsFalse()
    {
        var inMemorySettings = new Dictionary<string, string?> { { "Telegram:IsEnabled", "false" } };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(inMemorySettings).Build();
        var service = new TelegramBotService(new HttpClient(), configuration, NullLogger<TelegramBotService>.Instance);

        var result = await service.SendInvoiceDisputeAlertAsync("Khach A", "P101", "HD001", "Sai tiền điện", "Mô tả");
        Assert.False(result);
    }
}

