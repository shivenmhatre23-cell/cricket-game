using NUnit.Framework;
using UnityEngine;
using CricketLegends.Core;

namespace CricketLegends.Tests
{
    public class GameStateManagerTests
    {
        private GameObject _holder;
        private GameStateManager _stateManager;

        [SetUp]
        public void SetUp()
        {
            _holder = new GameObject("Test_GameStateManager");
            _stateManager = _holder.AddComponent<GameStateManager>();
        }

        [TearDown]
        public void TearDown()
        {
            if (_holder != null)
            {
                Object.DestroyImmediate(_holder);
            }
        }

        [Test]
        public void InitialState_IsMainMenu()
        {
            Assert.AreEqual(GameState.MainMenu, _stateManager.CurrentState);
        }

        [Test]
        public void ValidTransition_MainMenu_To_Toss_Succeeds()
        {
            bool success = _stateManager.TryChangeState(GameState.Toss);
            Assert.IsTrue(success);
            Assert.AreEqual(GameState.Toss, _stateManager.CurrentState);
        }

        [Test]
        public void StandardDeliveryCycle_TransitionsSucceed()
        {
            // MainMenu -> Toss -> Ready -> Bowling -> BallInPlay -> DeliveryResult -> Ready
            Assert.IsTrue(_stateManager.TryChangeState(GameState.Toss));
            Assert.IsTrue(_stateManager.TryChangeState(GameState.Ready));
            Assert.IsTrue(_stateManager.TryChangeState(GameState.Bowling));
            Assert.IsTrue(_stateManager.TryChangeState(GameState.BallInPlay));
            Assert.IsTrue(_stateManager.TryChangeState(GameState.DeliveryResult));
            Assert.IsTrue(_stateManager.TryChangeState(GameState.Ready));

            Assert.AreEqual(GameState.Ready, _stateManager.CurrentState);
        }

        [Test]
        public void InvalidTransition_MainMenu_DirectTo_BallInPlay_IsRejected()
        {
            bool success = _stateManager.TryChangeState(GameState.BallInPlay);
            Assert.IsFalse(success);
            Assert.AreEqual(GameState.MainMenu, _stateManager.CurrentState);
        }

        [Test]
        public void InvalidTransition_Bowling_DirectTo_InningsBreak_IsRejected()
        {
            _stateManager.TryChangeState(GameState.Ready);
            _stateManager.TryChangeState(GameState.Bowling);

            bool success = _stateManager.TryChangeState(GameState.InningsBreak);
            Assert.IsFalse(success);
            Assert.AreEqual(GameState.Bowling, _stateManager.CurrentState);
        }

        [Test]
        public void PauseAndResume_RestoresPrePauseState()
        {
            _stateManager.TryChangeState(GameState.Ready);
            _stateManager.TryChangeState(GameState.Bowling);
            Assert.AreEqual(GameState.Bowling, _stateManager.CurrentState);

            // Pause
            bool paused = _stateManager.Pause();
            Assert.IsTrue(paused);
            Assert.AreEqual(GameState.Paused, _stateManager.CurrentState);
            Assert.AreEqual(GameState.Bowling, _stateManager.PreviousState);

            // Resume
            bool resumed = _stateManager.Resume();
            Assert.IsTrue(resumed);
            Assert.AreEqual(GameState.Bowling, _stateManager.CurrentState);
        }

        [Test]
        public void OnStateChanged_FiresWithCorrectPreviousAndNewState()
        {
            GameState reportedOld = GameState.MatchOver;
            GameState reportedNew = GameState.MatchOver;
            int eventCount = 0;

            _stateManager.OnStateChanged += (oldState, newState) =>
            {
                reportedOld = oldState;
                reportedNew = newState;
                eventCount++;
            };

            _stateManager.TryChangeState(GameState.Toss);

            Assert.AreEqual(1, eventCount);
            Assert.AreEqual(GameState.MainMenu, reportedOld);
            Assert.AreEqual(GameState.Toss, reportedNew);
        }
    }
}
