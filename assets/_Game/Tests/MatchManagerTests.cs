using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;
using CricketLegends.Gameplay;

namespace CricketLegends.Tests
{
    public class MatchManagerTests
    {
        private GameObject _holder;
        private GameStateManager _stateManager;
        private MatchManager _matchManager;
        private MatchConfiguration _config;

        [SetUp]
        public void SetUp()
        {
            _holder = new GameObject("Test_MatchManager");
            _stateManager = _holder.AddComponent<GameStateManager>();
            _matchManager = _holder.AddComponent<MatchManager>();
            _config = ScriptableObject.CreateInstance<MatchConfiguration>();
            _config.SetOvers(2);

            _matchManager.Initialize(_stateManager, _config);
        }

        [TearDown]
        public void TearDown()
        {
            CricketEvents.ClearAllListeners();
            if (_config != null) Object.DestroyImmediate(_config);
            if (_holder != null) Object.DestroyImmediate(_holder);
        }

        [Test]
        public void InitialState_HasNoActiveDelivery()
        {
            Assert.IsFalse(_matchManager.IsDeliveryActive);
            Assert.AreEqual(0, _matchManager.ActiveDeliveryId);
            Assert.AreEqual(1, _matchManager.CurrentInnings);
            Assert.AreEqual(0, _matchManager.TotalRuns);
            Assert.AreEqual(0, _matchManager.TotalWickets);
        }

        [Test]
        public void StartingDeliveryInReadyState_SetsDeliveryActive()
        {
            _stateManager.TryChangeState(GameState.Ready);

            bool started = _matchManager.TryStartDelivery();

            Assert.IsTrue(started);
            Assert.IsTrue(_matchManager.IsDeliveryActive);
            Assert.AreEqual(1, _matchManager.ActiveDeliveryId);
            Assert.AreEqual(GameState.Bowling, _stateManager.CurrentState);
        }

        [Test]
        public void Invariant_OnlyOneDeliveryCanBeActiveAtATime()
        {
            _stateManager.TryChangeState(GameState.Ready);

            // 1st delivery begins
            bool firstStarted = _matchManager.TryStartDelivery();
            Assert.IsTrue(firstStarted);
            Assert.IsTrue(_matchManager.IsDeliveryActive);
            Assert.AreEqual(1, _matchManager.ActiveDeliveryId);

            // Attempting to trigger another delivery while first is active MUST fail
            bool secondAttempt = _matchManager.TryStartDelivery();
            Assert.IsFalse(secondAttempt, "Second delivery attempt must be rejected while delivery is active!");
            Assert.AreEqual(1, _matchManager.ActiveDeliveryId);
        }

        [Test]
        public void ConcludingDelivery_ReleasesActiveDeliveryFlag_AndUpdatesScore()
        {
            _stateManager.TryChangeState(GameState.Ready);
            _matchManager.TryStartDelivery();

            // Deliver ball into play
            _matchManager.MarkBallInPlay();
            Assert.AreEqual(GameState.BallInPlay, _stateManager.CurrentState);

            // Conclude delivery with 4 runs
            _matchManager.ConcludeDelivery(new DeliveryResultData
            {
                DeliveryId = 1,
                RunsScored = 4,
                IsLegalBall = true,
                IsBoundaryFour = true,
                IsWicket = false,
                DismissalType = "None",
                Description = "Boundary Four"
            });

            Assert.IsFalse(_matchManager.IsDeliveryActive);
            Assert.AreEqual(4, _matchManager.TotalRuns);
            Assert.AreEqual(0, _matchManager.TotalWickets);
            Assert.AreEqual(1, _matchManager.LegalBallsInOver);
            Assert.AreEqual(GameState.DeliveryResult, _stateManager.CurrentState);
        }
    }
}
