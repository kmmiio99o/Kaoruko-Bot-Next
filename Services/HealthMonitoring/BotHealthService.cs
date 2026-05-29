using Serilog;

namespace KaorukoBot.Services.HealthMonitoring;

/// <summary>
/// Monitors overall bot health metrics including memory, performance, and service status.
/// Can be injected as a service and called periodically to maintain bot stability.
/// </summary>
public class BotHealthService
{
    private readonly MemoryMonitor _memoryMonitor;
    private readonly ILogger _logger;
    private readonly int _monitoringIntervalSeconds;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _monitoringTask;
    private int _checkCounter = 0;

    /// <summary>
    /// Event triggered when critical health issue is detected.
    /// </summary>
    public event EventHandler<BotHealthAlert>? HealthAlertRaised;

    /// <summary>
    /// Creates a bot health service instance.
    /// </summary>
    /// <param name="memoryMonitor">Memory monitor instance.</param>
    /// <param name="monitoringIntervalSeconds">Interval between health checks in seconds. Default: 30</param>
    /// <param name="logger">Logger instance.</param>
    public BotHealthService(
        MemoryMonitor? memoryMonitor = null,
        int monitoringIntervalSeconds = 30,
        ILogger? logger = null)
    {
        _memoryMonitor = memoryMonitor ?? new MemoryMonitor();
        _logger = logger ?? Log.ForContext(GetType());
        _monitoringIntervalSeconds = monitoringIntervalSeconds;
    }

    /// <summary>
    /// Starts continuous health monitoring in a background task.
    /// </summary>
    public void StartMonitoring()
    {
        if (_monitoringTask is { IsCompleted: false })
        {
            _logger.Warning("Health monitoring already running");
            return;
        }

        _cancellationTokenSource = new CancellationTokenSource();
        _monitoringTask = MonitoringLoopAsync(_cancellationTokenSource.Token);
        _logger.Information("Bot health monitoring started");
    }

    /// <summary>
    /// Stops continuous health monitoring.
    /// </summary>
    public async Task StopMonitoringAsync()
    {
        _cancellationTokenSource?.Cancel();
        if (_monitoringTask != null)
        {
            try
            {
                await _monitoringTask;
            }
            catch (OperationCanceledException)
            {
                // Expected
            }
        }
        _logger.Information("Bot health monitoring stopped");
    }

    /// <summary>
    /// Performs a single health check immediately.
    /// </summary>
    public async Task<BotHealthReport> CheckHealthAsync()
    {
        var report = new BotHealthReport
        {
            Timestamp = DateTime.UtcNow,
            MemoryStatistics = _memoryMonitor.GetStatistics()
        };

        // Check for memory leaks
        if (_memoryMonitor.DetectMemoryGrowth())
        {
            report.Issues.Add("Possible memory leak detected - consistent memory growth observed");
            RaiseHealthAlert(BotHealthAlertLevel.Warning, "Memory Leak", "Consistent memory growth pattern detected");
        }

        // Check critical memory levels
        if (report.MemoryStatistics.IsCritical)
        {
            report.Issues.Add($"Critical memory usage: {report.MemoryStatistics.CurrentMemoryMb}MB");
            report.IsHealthy = false;
            RaiseHealthAlert(BotHealthAlertLevel.Critical, "Critical Memory", 
                $"Memory usage at {report.MemoryStatistics.CurrentMemoryMb}MB (critical threshold)");
        }

        // Check warning memory levels
        if (report.MemoryStatistics.IsWarning && !report.MemoryStatistics.IsCritical)
        {
            report.Issues.Add($"Warning memory usage: {report.MemoryStatistics.CurrentMemoryMb}MB");
            RaiseHealthAlert(BotHealthAlertLevel.Warning, "High Memory", 
                $"Memory usage at {report.MemoryStatistics.CurrentMemoryMb}MB (warning threshold)");
        }

        return report;
    }

    /// <summary>
    /// Background monitoring loop that performs periodic health checks.
    /// </summary>
    private async Task MonitoringLoopAsync(CancellationToken cancellationToken)
    {
        try
        {
            while (!cancellationToken.IsCancellationRequested)
            {
                _memoryMonitor.RecordMemoryUsage();
                
                // Perform detailed check periodically (every 3 intervals)
                if (++_checkCounter % 3 == 0)
                {
                    await CheckHealthAsync();
                }

                await Task.Delay(_monitoringIntervalSeconds * 1000, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Expected when monitoring is stopped
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Health monitoring loop encountered error");
        }
    }

    /// <summary>
    /// Triggers a health alert event.
    /// </summary>
    private void RaiseHealthAlert(BotHealthAlertLevel level, string title, string message)
    {
        HealthAlertRaised?.Invoke(this, new BotHealthAlert
        {
            Level = level,
            Title = title,
            Message = message,
            Timestamp = DateTime.UtcNow
        });
    }

    /// <summary>
    /// Gets memory monitor instance for advanced diagnostics.
    /// </summary>
    public MemoryMonitor GetMemoryMonitor() => _memoryMonitor;

    /// <summary>
    /// Gets current health status.
    /// </summary>
    public async Task<BotHealthReport> GetHealthStatusAsync() => await CheckHealthAsync();
}

/// <summary>
/// Overall bot health report.
/// </summary>
public class BotHealthReport
{
    public DateTime Timestamp { get; set; }
    public bool IsHealthy { get; set; } = true;
    public MemoryStatistics? MemoryStatistics { get; set; }
    public List<string> Issues { get; set; } = new();
}

/// <summary>
/// Health alert information.
/// </summary>
public class BotHealthAlert
{
    public BotHealthAlertLevel Level { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}

/// <summary>
/// Health alert severity levels.
/// </summary>
public enum BotHealthAlertLevel
{
    Info,
    Warning,
    Critical
}
