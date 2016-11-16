
function checkResponse(response) {
    if (response.status < 200 || response.status >= 300) {
        var error = new Error(`Error loading ${response.url}: status ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

export default {

    json(url) {
        return fetch(url).then((response) => {
            checkResponse(response);
            return response.json();
        });
    },

    xml(url) {
        return fetch(url).then((response) => {
            checkResponse(response);
            return response.text();
        }).then(text => new window.DOMParser().parseFromString(text, 'text/xml'));
    },
};
