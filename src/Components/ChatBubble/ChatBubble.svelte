<script>
  export let message = "";
  export let className = "";
  export let status = "";
  export let id = "";
</script>

<div class={className}>
  <span>{message}</span>
  <span>{typeof message === 'string' ? message : JSON.stringify(message)}</span>


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
