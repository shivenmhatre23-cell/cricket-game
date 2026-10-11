using System;
using System.Collections.Generic;
using System.IO;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;

namespace CricketLegends.SaveSystem
{
    [Serializable]
    public struct SaveHeader
    {
        public int SchemaVersion;
        public string SaveDate;

        public static SaveHeader CreateDefault() => new SaveHeader
        {
            SchemaVersion = 1,
            SaveDate = DateTime.Now.ToString("o")
        };
    }

    [Serializable]
    public class TournamentSaveData
    {
        public SaveHeader Header;
        public string TournamentName;
        public TournamentFormatType Format;
        public int MatchOvers;
        public bool IsComplete;
        public string ChampionTeamId;
        public List<TeamStanding> Standings;
        public List<TournamentFixture> Fixtures;
    }

    [Serializable]
    public class CareerSaveData
    {
        public SaveHeader Header;
        public string ManagerName;
        public string SelectedTeamId;
        public string SelectedTeamName;
        public int MatchesPlayed;
        public int MatchesWon;
        public int TrophiesWon;
        public int UnlockedTier;
        public List<CareerMatchLog> MatchHistory;
    }

    /// <summary>
    /// Local offline save system with schema versioning, JSON serialization,
    /// integrity validation, and graceful recovery from missing or corrupted saves.
    /// </summary>
    public static class SaveManager
    {
        public const int CurrentSchemaVersion = 1;

        // In-memory fallback persistence dictionary for tests / environments without disk write access
        private static readonly Dictionary<string, string> _inMemoryStorage = new Dictionary<string, string>();

        public static string TournamentSavePath => Path.Combine(Application.persistentDataPath, "tournament_save.json");
        public static string CareerSavePath => Path.Combine(Application.persistentDataPath, "career_save.json");

        // ==========================================
        // TOURNAMENT SAVE & LOAD
        // ==========================================

        public static string SerializeTournament(TournamentManager tm)
        {
            if (tm == null) return null;

            var data = new TournamentSaveData
            {
                Header = SaveHeader.CreateDefault(),
                TournamentName = tm.TournamentName,
                Format = tm.Format,
                MatchOvers = tm.MatchOvers,
                IsComplete = tm.IsTournamentComplete,
                ChampionTeamId = tm.ChampionTeamId,
                Standings = new List<TeamStanding>(tm.Standings),
                Fixtures = new List<TournamentFixture>(tm.Fixtures)
            };

            return JsonUtility.ToJson(data, true);
        }

        public static TournamentSaveData DeserializeTournament(string json, out string validationError)
        {
            validationError = null;
            if (string.IsNullOrWhiteSpace(json))
            {
                validationError = "Save data is null or empty.";
                return null;
            }

            try
            {
                var data = JsonUtility.FromJson<TournamentSaveData>(json);
                if (data == null)
                {
                    validationError = "Corrupted JSON format.";
                    return null;
                }

                if (data.Header.SchemaVersion != CurrentSchemaVersion)
                {
                    validationError = $"Schema version mismatch: expected {CurrentSchemaVersion}, got {data.Header.SchemaVersion}.";
                    return null;
                }

                if (data.Standings == null || data.Fixtures == null)
                {
                    validationError = "Missing standings or fixtures data.";
                    return null;
                }

                return data;
            }
            catch (Exception ex)
            {
                validationError = $"JSON parse exception: {ex.Message}";
                CricketLogger.LogWarning(LogChannel.SaveSystem, validationError);
                return null;
            }
        }

        public static bool SaveTournamentLocally(TournamentManager tm)
        {
            string json = SerializeTournament(tm);
            if (json == null) return false;

            _inMemoryStorage["tournament"] = json;

            try
            {
                File.WriteAllText(TournamentSavePath, json);
                CricketLogger.LogInfo(LogChannel.SaveSystem, "Tournament state saved to disk.");
                return true;
            }
            catch (Exception ex)
            {
                CricketLogger.LogWarning(LogChannel.SaveSystem, $"Disk save failed, stored in-memory: {ex.Message}");
                return true;
            }
        }

        public static bool LoadTournamentLocally(TournamentManager tm)
        {
            if (tm == null) return false;

            string json = null;
            if (File.Exists(TournamentSavePath))
            {
                try { json = File.ReadAllText(TournamentSavePath); } catch { /* fallback */ }
            }

            if (json == null && _inMemoryStorage.ContainsKey("tournament"))
            {
                json = _inMemoryStorage["tournament"];
            }

            var data = DeserializeTournament(json, out string error);
            if (data == null)
            {
                CricketLogger.LogWarning(LogChannel.SaveSystem, $"Tournament load fallback: {error}");
                return false;
            }

            tm.RestoreFromSave(
                data.TournamentName,
                data.Format,
                data.MatchOvers,
                data.IsComplete,
                data.ChampionTeamId,
                data.Standings,
                data.Fixtures
            );
            return true;
        }

        // ==========================================
        // CAREER SAVE & LOAD
        // ==========================================

        public static string SerializeCareer(CareerManager cm)
        {
            if (cm == null) return null;

            var data = new CareerSaveData
            {
                Header = SaveHeader.CreateDefault(),
                ManagerName = cm.ManagerName,
                SelectedTeamId = cm.SelectedTeamId,
                SelectedTeamName = cm.SelectedTeamName,
                MatchesPlayed = cm.MatchesPlayed,
                MatchesWon = cm.MatchesWon,
                TrophiesWon = cm.TrophiesWon,
                UnlockedTier = cm.UnlockedTier,
                MatchHistory = new List<CareerMatchLog>(cm.MatchHistory)
            };

            return JsonUtility.ToJson(data, true);
        }

        public static CareerSaveData DeserializeCareer(string json, out string validationError)
        {
            validationError = null;
            if (string.IsNullOrWhiteSpace(json))
            {
                validationError = "Career save is null or empty.";
                return null;
            }

            try
            {
                var data = JsonUtility.FromJson<CareerSaveData>(json);
                if (data == null || data.Header.SchemaVersion != CurrentSchemaVersion)
                {
                    validationError = "Corrupted career save or schema mismatch.";
                    return null;
                }
                return data;
            }
            catch (Exception ex)
            {
                validationError = $"Career parse exception: {ex.Message}";
                return null;
            }
        }

        public static bool SaveCareerLocally(CareerManager cm)
        {
            string json = SerializeCareer(cm);
            if (json == null) return false;

            _inMemoryStorage["career"] = json;
            try
            {
                File.WriteAllText(CareerSavePath, json);
                return true;
            }
            catch
            {
                return true; // in-memory saved
            }
        }

        public static bool LoadCareerLocally(CareerManager cm)
        {
            if (cm == null) return false;

            string json = null;
            if (File.Exists(CareerSavePath))
            {
                try { json = File.ReadAllText(CareerSavePath); } catch { }
            }

            if (json == null && _inMemoryStorage.ContainsKey("career"))
            {
                json = _inMemoryStorage["career"];
            }

            var data = DeserializeCareer(json, out string error);
            if (data == null)
            {
                CricketLogger.LogWarning(LogChannel.SaveSystem, $"Career load fallback: {error}");
                return false;
            }

            cm.RestoreFromSave(
                data.ManagerName,
                data.SelectedTeamId,
                data.SelectedTeamName,
                data.MatchesPlayed,
                data.MatchesWon,
                data.TrophiesWon,
                data.UnlockedTier,
                data.MatchHistory
            );
            return true;
        }

        public static void ClearStorageForTesting()
        {
            _inMemoryStorage.Clear();
            if (File.Exists(TournamentSavePath)) try { File.Delete(TournamentSavePath); } catch { }
            if (File.Exists(CareerSavePath)) try { File.Delete(CareerSavePath); } catch { }
        }
    }
}
