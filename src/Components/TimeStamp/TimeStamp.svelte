<script>
  export let time = "";
  const date = new Date(time);
  const istTime=new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
  console.log(istTime);
  
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
