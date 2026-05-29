using System.Net;
using KaorukoBot.Services;

namespace KaorukoBot;

public partial class Bot
{
    private static void StartHealthServer(int port)
    {
        try
        {
            var listener = new HttpListener();
            listener.Prefixes.Add($"http://+:{port}/");
            Task.Run(async () =>
            {
                try
                {
                    listener.Start();
                    while (true)
                    {
                        var context = await listener.GetContextAsync();
                        var response = context.Response;
                        var buffer = System.Text.Encoding.UTF8.GetBytes("{\"status\":\"ok\"}");
                        response.ContentType = "application/json";
                        response.ContentLength64 = buffer.Length;
                        await response.OutputStream.WriteAsync(buffer);
                        response.OutputStream.Close();
                    }
                }
                catch { }
            });
            LoggingService.Info($"Health check server running on port {port}");
        }
        catch (Exception ex)
        {
            LoggingService.Warn($"Failed to start health check server: {ex.Message}");
        }
    }
}
