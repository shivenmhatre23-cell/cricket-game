using System;
using UnityEngine;

namespace CricketLegends.Core
{
    public enum LogChannel
    {
        Core,
        Gameplay,
        Input,
        Physics,
        Players,
        AI,
        Rules,
        UI,
        SaveSystem
    }

    public enum LogLevel
    {
        Diagnostic = 0,
        Info = 1,
        Warning = 2,
        Error = 3,
        None = 4
    }

    /// <summary>
    /// Centralized diagnostics and logging utility for Cricket Legends.
    /// Provides channeled, colored, and timestamped console logs with safe null handling.
    /// </summary>
    public static class CricketLogger
    {
        public static LogLevel MinimumLogLevel { get; set; } = LogLevel.Diagnostic;
        public static bool ShowTimestamps { get; set; } = true;

        public static void LogDiagnostic(LogChannel channel, string message, UnityEngine.Object context = null)
        {
            if (MinimumLogLevel <= LogLevel.Diagnostic)
            {
                Debug.Log(FormatMessage("grey", channel, message), context);
            }
        }

        public static void LogInfo(LogChannel channel, string message, UnityEngine.Object context = null)
        {
            if (MinimumLogLevel <= LogLevel.Info)
            {
                Debug.Log(FormatMessage("#00e5ff", channel, message), context);
            }
        }

        public static void LogWarning(LogChannel channel, string message, UnityEngine.Object context = null)
        {
            if (MinimumLogLevel <= LogLevel.Warning)
            {
                Debug.LogWarning(FormatMessage("#ffd600", channel, message), context);
            }
        }

        public static void LogError(LogChannel channel, string message, UnityEngine.Object context = null)
        {
            if (MinimumLogLevel <= LogLevel.Error)
            {
                Debug.LogError(FormatMessage("#ff1744", channel, message), context);
            }
        }

        public static void LogException(LogChannel channel, Exception exception, UnityEngine.Object context = null)
        {
            Debug.LogError($"[CricketLegends][{channel}][EXCEPTION] {exception?.Message}\n{exception?.StackTrace}", context);
        }

        private static string FormatMessage(string hexColor, LogChannel channel, string message)
        {
            string timestamp = ShowTimestamps ? $"[{DateTime.Now:HH:mm:ss.fff}]" : string.Empty;
            return $"{timestamp} <color={hexColor}><b>[CricketLegends::{channel}]</b></color> {message}";
        }
    }
}
