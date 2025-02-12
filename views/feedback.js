var currentIndex = 0;
var facultiesCount = faculties.length;
var filledSections = 0;

function showNextFaculty(index) {
    document.getElementById('faculty' + index).style.display = 'none';
    currentIndex = index + 1;
    if (currentIndex < facultiesCount) {
        document.getElementById('faculty' + currentIndex).style.display = 'block';
    }
    if (currentIndex === facultiesCount - 1) {
        document.getElementById('submitButton').style.display = 'inline';
    }
}

function showPreviousFaculty(index) {
    document.getElementById('faculty' + index).style.display = 'none';
    currentIndex = index - 1;
    document.getElementById('faculty' + currentIndex).style.display = 'block';
}

function selectPoint(point, question, index) {
    var points = document.querySelectorAll('#point' + index + '-' + question + ' li');
    points.forEach(function(item) {
        item.classList.remove('active');
    });
    document.getElementById('point' + index + '-' + question + '-' + point).classList.add('active');
    document.getElementById('selectedPoint' + index + '-' + question).value = point;
    checkFilledSections();
}

function checkFilledSections() {
    filledSections++;
    if (filledSections === facultiesCount) {
        document.getElementById('submitButton').style.display = 'inline';
    }

}
document.getElementById("feedbackForm").addEventListener("submit", function (event) {
    var confirmation = confirm("Are you sure you want to submit your feedback? Once submitted, it cannot be changed.");
    
    if (!confirmation) {
        event.preventDefault(); // Prevent form submission if user cancels
    }
});

