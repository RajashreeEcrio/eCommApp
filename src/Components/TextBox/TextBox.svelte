<script>
  export let type;
  export let value='';
  export let placeholder;
  export let onInput;
  export let className;
  export let ref;
</script>

<input value={value} bind:this={ref} type={type} {placeholder} on:input={onInput} class={className} />
