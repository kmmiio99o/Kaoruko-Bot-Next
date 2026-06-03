# ---- Build Stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder

WORKDIR /src

# Copy project file and restore (layer caching)
COPY KaorukoBot.csproj .
RUN dotnet restore

# Copy all source files
COPY . .

# Build and publish in Release mode
RUN dotnet publish -c Release -o /app --no-restore

# ---- Runtime Stage ----
FROM mcr.microsoft.com/dotnet/runtime:10.0 AS runner

WORKDIR /app

COPY --from=builder /app .

# SQLite database will be created at runtime
VOLUME /app/data

ENTRYPOINT ["dotnet", "KaorukoBot.dll"]
