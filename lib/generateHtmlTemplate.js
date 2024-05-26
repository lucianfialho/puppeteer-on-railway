module.exports = (title, image) => `
<html>
    <head>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@800&display=swap" rel="stylesheet">

    <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body>
    <div class="w-[800px] text-white h-[800px] flex flex-col gap-y-8 items-center justify-center bg-center bg-no-repeat" style="background-image: url('${image}');">
        <div class="bg-black bg-opacity-40 p-4 rounded h-full">
            <h1 class="text-white text-4xl font-bold text-center" style="font-family: Sora; margin-top: 70%;">
                ${title}
            </h1>
        </div>
    </div>
    </body>
</html>`;
