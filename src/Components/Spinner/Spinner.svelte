<div class="spinner"></div>

<style>
  .spinner {
    width: 26px;
    height: 26px;
    border: 3.5px solid lime;
    border-top: 3.5px solid transparent;
    border-radius: 50%;
    animation:
      spin 1s linear infinite,
      touch 1.5s ease-in-out infinite;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  @keyframes spin {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }

  @keyframes touch {
    0%,
    100% {
      border-top: 3px solid transparent;
    }
    65% {
      border-top: 3px solid lime;
    }
  }
</style>
