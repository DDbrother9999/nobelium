// run this command:
// osascript -e 'tell application "Adobe InDesign 2026" to do script (POSIX file "/Users/ddbrother/Github/nobelium/scripts/batchexport.jsx") language javascript'
// select indesign folders and this will mass import them

var folder;
if (typeof arguments !== "undefined" && arguments.length > 0) {
    folder = new Folder(arguments[0]);
} else {
    folder = Folder.selectDialog("Select the folder containing your InDesign files");
}

if (folder != null) {
    // Get all .indd files in the selected folder
    var files = folder.getFiles("*.indd");

    for (var i = 0; i < files.length; i++) {
        // Open the document silently without showing window
        var doc = app.open(files[i], false);

        // Define the output file path using the original file path
        var outFileName = files[i].fsName.replace(/\.indd$/i, ".html");
        var outFile = new File(outFileName);

        // Export as HTML
        // Note: InDesign's default HTML export is its "legacy" or standard HTML export
        doc.exportFile(ExportFormat.HTML, outFile);

        // Close the document without saving changes
        doc.close(SaveOptions.NO);
    }
    if (typeof arguments === "undefined" || arguments.length === 0) {
        alert("Batch export completed successfully!");
    }
}
