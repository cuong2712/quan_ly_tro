using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using SmartRent.Core.DTOs;
using System.Reflection;

namespace SmartRent.API.Filters;

// Filter chuẩn hóa toàn bộ phản hồi API thành định dạng chuẩn: { code, success, message, data }
public class ApiResponseFilter : IAsyncResultFilter
{
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        // Bỏ qua nếu là FileResult, StreamResult hoặc Swagger endpoint
        if (context.Result is FileResult || context.Result is FileStreamResult || context.Result is FileContentResult)
        {
            await next();
            return;
        }

        if (context.Result is ObjectResult objectResult)
        {
            var value = objectResult.Value;
            var statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;

            // Nếu value đã là instance của ApiResponse hoặc ApiResponse<T>
            if (value is ApiResponse || (value != null && IsSubclassOfRawGeneric(typeof(ApiResponse<>), value.GetType())))
            {
                await next();
                return;
            }

            // Xử lý mã lỗi (4xx, 5xx)
            if (statusCode >= 400)
            {
                string message = ExtractMessage(value) ?? (statusCode == 404 ? "Không tìm thấy dữ liệu yêu cầu" : "Yêu cầu không hợp lệ");
                objectResult.Value = new ApiResponse<object?>(statusCode, false, message, null);
            }
            else
            {
                // Xử lý thành công (200, 201...)
                string message = ExtractMessage(value) ?? "Thao tác thành công";

                if (IsMessageOnlyObject(value))
                {
                    objectResult.Value = new ApiResponse<object?>(statusCode, true, message, null);
                }
                else
                {
                    objectResult.Value = new ApiResponse<object?>(statusCode, true, message, value);
                }
            }
        }
        else if (context.Result is StatusCodeResult statusCodeResult)
        {
            var statusCode = statusCodeResult.StatusCode;
            bool isSuccess = statusCode < 400;
            string message = isSuccess ? "Thao tác thành công" : (statusCode == 404 ? "Không tìm thấy dữ liệu" : "Thao tác thất bại");
            
            context.Result = new ObjectResult(new ApiResponse<object?>(statusCode, isSuccess, message, null))
            {
                StatusCode = statusCode
            };
        }
        else if (context.Result is EmptyResult)
        {
            context.Result = new ObjectResult(ApiResponse.Ok("Thao tác thành công", StatusCodes.Status200OK))
            {
                StatusCode = StatusCodes.Status200OK
            };
        }

        await next();
    }

    private static bool IsSubclassOfRawGeneric(Type generic, Type? toCheck)
    {
        while (toCheck != null && toCheck != typeof(object))
        {
            var cur = toCheck.IsGenericType ? toCheck.GetGenericTypeDefinition() : toCheck;
            if (generic == cur) return true;
            toCheck = toCheck.BaseType;
        }
        return false;
    }

    private static string? ExtractMessage(object? value)
    {
        if (value == null) return null;
        if (value is string str) return str;

        var type = value.GetType();
        var msgProp = type.GetProperty("message", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                   ?? type.GetProperty("Message", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

        if (msgProp != null)
        {
            var msgVal = msgProp.GetValue(value);
            if (msgVal != null) return msgVal.ToString();
        }

        return null;
    }

    private static bool IsMessageOnlyObject(object? value)
    {
        if (value == null) return false;
        var type = value.GetType();
        var props = type.GetProperties(BindingFlags.Public | BindingFlags.Instance);
        return props.Length == 1 && props[0].Name.Equals("message", StringComparison.OrdinalIgnoreCase);
    }
}
