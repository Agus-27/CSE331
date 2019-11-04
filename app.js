var API_URL = 'https://das-lab.org/cse331fa2019/PhotosBackend/';
var GROUP_ID = 756756;

$(document).ready(function() {
  loadResults();
});

function loadResults() {
   
  function resultHtml(res) {
    return `
      <div class="card result_card">
        <img src=${(API_URL + res.tn_src)} class="card-img-top"/>
      </div>
    `;
  }

  $.getJSON(API_URL + 'getPhotos.php?grp_id=' + GROUP_ID, function(data) {
    const render = data.map(result => resultHtml(result)).join(' ');
    $("#resultsCards").html(render);
  });
}
