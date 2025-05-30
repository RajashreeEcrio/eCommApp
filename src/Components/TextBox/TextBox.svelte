<script>
  import { createEventDispatcher } from 'svelte';

  export let value = "";
  export let placeholder = "";
  export let className = "";
  export let ref = null;
  export let type = "text";

  const dispatch = createEventDispatcher();

  function onInput(event) {
    value = event.target.value;
    dispatch('input', event);
  }
</script>

{#if type === 'password'}
  <input
    bind:this={ref}
    type="password"
    placeholder={placeholder}
    bind:value
    class={className}
    on:input={onInput}
  />
{:else}
  <input
    bind:this={ref}
    type="text"
    placeholder={placeholder}
    bind:value
    class={className}
    on:input={onInput}
  />
{/if}

<style>
  .loginInput {
    margin-bottom: 8px;
    width: 100%;
  }
</style>
