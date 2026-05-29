using System.Collections.Concurrent;
using Serilog;

namespace KaorukoBot.Services.HealthMonitoring;

/// <summary>
/// Monitors memory usage over time and detects memory growth patterns.
/// Provides early warning system for potential memory leaks.
/// </summary>
public class MemoryMonitor
{
    private readonly ILogger _logger;
    private readonly ConcurrentQueue<MemorySnapshot> _memoryHistory;
    private readonly int _historySize;
    private readonly long _warningThresholdBytes;
    private readonly long _criticalThresholdBytes;
    private long _lastLoggedMemory;

    /// <summary>
    /// Memory snapshot at a point in time.
    /// </summary>
    private class MemorySnapshot
    {
        public DateTime Timestamp { get; set; }
        public long MemoryBytes { get; set; }
        public long WorkingSetBytes { get; set; }
    }

    /// <summary>
    /// Creates a memory monitor instance.
    /// </summary>
    /// <param name="warningThresholdMb">Trigger warning when memory exceeds this value in MB. Default: 500MB</param>
    /// <param name="criticalThresholdMb">Trigger critical alert when memory exceeds this value in MB. Default: 800MB</param>
    /// <param name="historySize">Number of memory snapshots to keep in history. Default: 100</param>
    /// <param name="logger">Logger instance for warnings and diagnostics.</param>
    public MemoryMonitor(
        int warningThresholdMb = 500,
        int criticalThresholdMb = 800,
        int historySize = 100,
        ILogger? logger = null)
    {
        _logger = logger ?? Log.ForContext(GetType());
        _warningThresholdBytes = warningThresholdMb * 1024 * 1024;
        _criticalThresholdBytes = criticalThresholdMb * 1024 * 1024;
        _historySize = historySize;
        _memoryHistory = new ConcurrentQueue<MemorySnapshot>();
        _lastLoggedMemory = 0;
    }

    /// <summary>
    /// Records current memory usage. Call this periodically (e.g., every 30 seconds).
    /// </summary>
    public void RecordMemoryUsage()
    {
        try
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var currentMemory = process.WorkingSet64;

            var snapshot = new MemorySnapshot
            {
                Timestamp = DateTime.UtcNow,
                MemoryBytes = GC.GetTotalMemory(false),
                WorkingSetBytes = currentMemory
            };

            _memoryHistory.Enqueue(snapshot);

            // Keep history size bounded
            while (_memoryHistory.Count > _historySize)
            {
                _memoryHistory.TryDequeue(out _);
            }

            CheckMemoryThresholds(currentMemory);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error recording memory usage");
        }
    }

    /// <summary>
    /// Checks if memory usage exceeds warning or critical thresholds.
    /// </summary>
    private void CheckMemoryThresholds(long currentMemory)
    {
        if (currentMemory >= _criticalThresholdBytes)
        {
            _logger.Error("CRITICAL: Memory usage is {MemoryMb}MB (threshold: {ThresholdMb}MB). Bot may require restart.",
                currentMemory / (1024 * 1024),
                _criticalThresholdBytes / (1024 * 1024));
        }
        else if (currentMemory >= _warningThresholdBytes)
        {
            // Only log if there's been significant change to avoid spam
            if (Math.Abs(currentMemory - _lastLoggedMemory) > 50 * 1024 * 1024) // 50MB difference
            {
                _logger.Warning("WARNING: Memory usage is {MemoryMb}MB (threshold: {ThresholdMb}MB). Monitoring for leaks.",
                    currentMemory / (1024 * 1024),
                    _warningThresholdBytes / (1024 * 1024));
                _lastLoggedMemory = currentMemory;
            }
        }
    }

    /// <summary>
    /// Detects memory growth pattern (possible leak).
    /// Returns true if memory has been consistently growing.
    /// </summary>
    /// <param name="growthCheckCount">Number of recent snapshots to analyze. Default: 10</param>
    /// <returns>True if memory is growing consistently, false otherwise.</returns>
    public bool DetectMemoryGrowth(int growthCheckCount = 10)
    {
        if (_memoryHistory.Count < growthCheckCount + 1)
            return false;

        var snapshots = _memoryHistory.OrderBy(s => s.Timestamp).TakeLast(growthCheckCount + 1).ToList();

        // Check if each measurement is increasing
        for (int i = 1; i < snapshots.Count; i++)
        {
            if (snapshots[i].MemoryBytes <= snapshots[i - 1].MemoryBytes)
            {
                return false; // Memory decreased or stayed same
            }
        }

        // All measurements were increasing - possible leak detected
        var firstMb = snapshots[0].MemoryBytes / (1024 * 1024);
        var lastMb = snapshots[snapshots.Count - 1].MemoryBytes / (1024 * 1024);
        var growthMb = lastMb - firstMb;

        _logger.Warning("Possible memory leak detected: Memory grew from {FirstMb}MB to {LastMb}MB (+{GrowthMb}MB)",
            firstMb, lastMb, growthMb);

        return true;
    }

    /// <summary>
    /// Gets current memory usage statistics.
    /// </summary>
    public MemoryStatistics GetStatistics()
    {
        try
        {
            var process = System.Diagnostics.Process.GetCurrentProcess();
            var workingSet = process.WorkingSet64;
            var gcMemory = GC.GetTotalMemory(false);

            var snapshots = _memoryHistory.ToList();
            var memoryTrend = "Unknown";

            if (snapshots.Count >= 2)
            {
                var firstSnapshot = snapshots[0];
                var lastSnapshot = snapshots[snapshots.Count - 1];
                var memoryChange = lastSnapshot.MemoryBytes - firstSnapshot.MemoryBytes;

                memoryTrend = memoryChange > 0 ? "Increasing" :
                              memoryChange < 0 ? "Decreasing" : "Stable";
            }

            return new MemoryStatistics
            {
                CurrentMemoryMb = workingSet / (1024 * 1024),
                GcMemoryMb = gcMemory / (1024 * 1024),
                WarningThresholdMb = _warningThresholdBytes / (1024 * 1024),
                CriticalThresholdMb = _criticalThresholdBytes / (1024 * 1024),
                HistoryCount = snapshots.Count,
                MemoryTrend = memoryTrend,
                IsCritical = workingSet >= _criticalThresholdBytes,
                IsWarning = workingSet >= _warningThresholdBytes
            };
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error getting memory statistics");
            return new MemoryStatistics { Error = ex.Message };
        }
    }

    /// <summary>
    /// Clears memory history.
    /// </summary>
    public void ClearHistory()
    {
        while (_memoryHistory.TryDequeue(out _)) { }
        _logger.Debug("Memory history cleared");
    }
}

/// <summary>
/// Memory usage statistics snapshot.
/// </summary>
public class MemoryStatistics
{
    public long CurrentMemoryMb { get; set; }
    public long GcMemoryMb { get; set; }
    public long WarningThresholdMb { get; set; }
    public long CriticalThresholdMb { get; set; }
    public int HistoryCount { get; set; }
    public string MemoryTrend { get; set; } = "Unknown";
    public bool IsCritical { get; set; }
    public bool IsWarning { get; set; }
    public string? Error { get; set; }
}
