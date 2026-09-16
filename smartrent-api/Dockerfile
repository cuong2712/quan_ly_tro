# ==========================================
# 1. Giai đoạn Build & Publish (.NET 9.0 SDK)
# ==========================================
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Sao chép các file .csproj để tối ưu Docker caching khi restore packages
COPY ["SmartRent.API/SmartRent.API.csproj", "SmartRent.API/"]
COPY ["SmartRent.Application/SmartRent.Application.csproj", "SmartRent.Application/"]
COPY ["SmartRent.Core/SmartRent.Core.csproj", "SmartRent.Core/"]
COPY ["SmartRent.Infrastructure/SmartRent.Infrastructure.csproj", "SmartRent.Infrastructure/"]
COPY ["SmartRent.sln", "./"]

RUN dotnet restore "SmartRent.API/SmartRent.API.csproj"

# Sao chép toàn bộ source code và publish
COPY . .
WORKDIR "/src/SmartRent.API"
RUN dotnet publish "SmartRent.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

# ==========================================
# 2. Giai đoạn Runtime (ASP.NET 9.0 gọn nhẹ)
# ==========================================
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Cài đặt font và thư viện bổ trợ cho QuestPDF xuất file PDF tiếng Việt trên Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    fontconfig \
    fonts-dejavu \
    libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Cấu hình cổng mạng (Render tự động truyền biến PORT khi khởi chạy)
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "SmartRent.API.dll"]

