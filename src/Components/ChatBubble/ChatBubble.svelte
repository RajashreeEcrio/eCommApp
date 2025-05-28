<script>
  export let message = "";
  export let className = "";
  export let status = "";
  export let id = "";
  // Safely extract message text
  let displayMessage = typeof message === "string" 
    ? message 
    : (message?.content || JSON.stringify(message));
</script>

<div class={className}>
  <span>{displayMessage}</span>


  {#if className === "sendBubble"}
    <span id={"tick-" + id} class="tick" class:seen={status === 'seen'}>

      {#if status === "seen"}
        ✓✓
      {:else if status === "delivered"}
        ✓✓
      {:else}
        ✓
      {/if}
    </span>
  {/if}
</div>

<style>
  .tick {
    font-size: 12px;
    margin-left: 6px;
    color: gray;
  }

  .tick.seen {
    color: blue;
  }
</style>
