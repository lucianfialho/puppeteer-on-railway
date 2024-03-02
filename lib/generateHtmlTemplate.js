module.exports = (word, translation) => `
<html>
    <head>

    <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
    <div class="bg-gray-900 w-[800px] text-white h-[800px] flex flex-col gap-y-8 items-center justify-center">
        <h1 class="text-[64px] text-center m-0 leading-[36px] font-bold">
            🇺🇸 "${word}"
        </h1>
        <h2 class="text-[56px] mt-[6px] font-normal">
            🇧🇷 "${translation}"
        </h2>
    </div>
    </body>
</html>`;
