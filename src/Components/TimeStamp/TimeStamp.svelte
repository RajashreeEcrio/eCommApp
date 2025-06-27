<script>
  export let time = "";
  const date = new Date(time);
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
</script>

<span>{formattedTime}</span>

<style>
  span {
    color: #fff;
    align-self: flex-end;
    font-size: 0.6rem;
  }
</style>
