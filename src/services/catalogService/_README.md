# About catalogs.json

List of catalogs in QS

Structure :

- name: name of catalog
- url: url of the feed, used to retrieve collections
- responseFormatOnSearch: what format is answered when a search is made on a collection of this catalog (either `application/atom+xml` either `application/vnd.geo+json`). For the moment, only atom+xml is supported
- avoidedAttributes: what attributes are not displayed in advanced filters criterias
- mandatoryAttributes: mandatory attributes used in search requests (for example requests on spacebel need recordSchema=om to retrieve EarthObservation metadatas)
-credentials : {
     "username": "the username",
     "password": "the password"
}
credentials are not mandatory, nut if exists then it shoumd contain the usename/pass for this catalog access
