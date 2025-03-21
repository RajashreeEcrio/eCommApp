<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";

  const handleKeyDown = (e) => {
    if (e.key === "ArrowRight") {
      push("/contacts");
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<p>Login page works!</p>
