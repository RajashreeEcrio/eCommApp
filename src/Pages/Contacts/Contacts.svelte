<script>
  import { onMount } from "svelte";
  import { push } from "svelte-spa-router";

  const handleKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      push("/");
    } else if (e.key === "ArrowRight") {
      push("/chatscreen");
    }
  };

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });
</script>

<p>Contacts page works!</p>
