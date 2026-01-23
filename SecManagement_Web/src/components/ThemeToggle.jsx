export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50
                 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
      title="Alternar tema"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
