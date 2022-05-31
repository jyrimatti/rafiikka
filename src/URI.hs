{-# LANGUAGE QuasiQuotes #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
module URI where

import Universum hiding (local, state)
import Text.URI (mkURI, URI, mkPathPiece, mkQueryKey, mkQueryValue, QueryParam (QueryParam, QueryFlag), unRText, RText, RTextLabel (PathPiece))
import Text.URI.Lens (uriPath, uriQuery, uriTrailingSlash)
import Text.URI.QQ ( uri )
import Browser.Browser ( isLocal, isSafari, isSeed )
import JSDOM.Types (JSM)
import JSDOM (currentWindow)
import Language.Javascript.JSaddle ((!), create, (<#))
import Language.Javascript.JSaddle.Classes (FromJSVal(fromJSVal))
import Data.Maybe (fromJust)
import Types (Train (Train, departureDate, trainNumber), Revisions (infra, etj2), Ratakmetaisyys (Ratakmetaisyys, kmetaisyys, ratanumero), Pmsijainti, Ratakmvali (Ratakmvali), OID, SRSName (CRS84), Point)
import URISerialization (ToURIFragment(toURIFragment))
import Time (Interval (Interval), roundToPreviousMonth, roundToNextMonth, roundToPreviousDay, infiniteInterval)
import StateAccessor (getMainState)
import State (AppState(AppState, timeSetting), roundTimeSettingToPreviousDay, TimeSetting (Span, Instant), toInterval)
import Control.Lens (filtered, folded)
import Data.Time (CalendarDiffTime)
import Language.Javascript.JSaddle.Value( ToJSVal(toJSVal), JSString )
import Jeti.Types ( VSTila, ESTila, EITila )
import Infra.Types ( ElementtiTypeName(..) )
import Ruma.Types ( RTTila )

aikatauluAPIUrl :: URI
aikatauluAPIUrl = [uri|https://rata.digitraffic.fi/api/v1/trains/|]

graphQLUrl :: URI
graphQLUrl = [uri|https://rata.digitraffic.fi/api/v1/graphql/graphiql/?|]

mqttHost :: Text
mqttHost = "rata.digitraffic.fi"

mqttPort :: Natural
mqttPort = 443;

mqttTopic :: Maybe Train -> Text
mqttTopic (Just Train{..}) = "train-locations/" <> toURIFragment departureDate <> "/" <> toURIFragment trainNumber
mqttTopic Nothing          = "train-locations/#"

infraInterval :: JSM [QueryParam]
infraInterval = do
    AppState{timeSetting} <- getMainState
    pure $ QueryParam <$> mkQueryKey "time"
                      <*> mkQueryValue (toURIFragment $ asInterval $ roundTimeSettingToPreviousDay timeSetting)

etj2Interval :: JSM [QueryParam]
etj2Interval = do
    AppState{timeSetting} <- getMainState
    let (Interval start end) = toInterval timeSetting
    pure $ QueryParam <$> mkQueryKey "time"
                      <*> mkQueryValue (toURIFragment $ Interval (roundToPreviousMonth start) (roundToNextMonth end))

rumaInterval :: JSM [QueryParam]
rumaInterval = do
    AppState{timeSetting} <- getMainState
    let (Interval start end) = toInterval timeSetting
    pure $ mkParam "start" (roundToPreviousDay start) <>
           mkParam "end"   (roundToPreviousDay end)

mkParam :: (Applicative f, MonadThrow f, ToURIFragment v) => Text -> v -> f QueryParam
mkParam key value = QueryParam <$> mkQueryKey key
                               <*> mkQueryValue (toURIFragment value)

baseInfraAPIUrl :: Bool -> JSM URI
baseInfraAPIUrl skipRevision = baseUrl "infra" (if skipRevision then Nothing else Just infra)

baseEtj2APIUrl :: Bool -> JSM URI
baseEtj2APIUrl skipRevision = baseUrl "jeti" (if skipRevision then Nothing else Just etj2)

baseRumaAPIUrl :: JSM URI
baseRumaAPIUrl = mkURI "https://rata.digitraffic.fi/api/v1/"

-- Infra-API URL with time
infraAPIUrl :: JSM URI
infraAPIUrl = over uriQuery . (<>) <$> infraInterval <*> baseInfraAPIUrl False

-- Etj2-API URL with time
etj2APIUrl :: JSM URI
etj2APIUrl = over uriQuery . (<>) <$> etj2Interval <*> baseEtj2APIUrl False

-- Ruma-API URL with time
rumaAPIUrl :: JSM URI
rumaAPIUrl = over uriQuery . (<>) <$> rumaInterval <*> baseRumaAPIUrl

infraAPIrevisionsUrl :: JSM URI
infraAPIrevisionsUrl = over uriQuery (<> mkParam "count" (1 :: Int)) .
                       over uriPath (<> mkPathPiece "revisions.json")
                       <$> baseInfraAPIUrl False

etj2APIrevisionsUrl :: JSM URI
etj2APIrevisionsUrl = over uriQuery (<> mkParam "count" (1 :: Int)) .
                      over uriPath (<> mkPathPiece "revisions.json")
                      <$> baseEtj2APIUrl False

baseUrl :: Text -> Maybe (Revisions -> Text) -> JSM URI
baseUrl api revision = do
    safari <- isSafari
    local <- isLocal
    seed <- isSeed

    Just win <- currentWindow
    Just revs <- fromJSVal =<< win ! ("revisions" :: Text)

    pure $ 
        set uriTrailingSlash True $
        fromJust $ mkURI $
        "https://" <>
        (if safari || local || seed then "rafiikka.lahteenmaki.net" else "rata.digitraffic.fi") <>
        "/" <> api <> "-api/0.7" <> maybe "" (("/" <>) . ($ revs)) revision

-- PREPENDs a path segment
path :: Text -> URI -> URI
path = over uriPath . flip (<>) . mkPathPiece

-- | asJson
-- >>> import Text.URI (render)
-- >>> render . asJson <$> mkURI "http://foo.bar/baz"
-- "http://foo.bar/baz.json"
-- >>> render . asJson <$> mkURI "http://foo.bar/baz.html"
-- "http://foo.bar/baz.html.json"
asJson :: URI -> URI
asJson = withExtension "json"

withExtension :: Text -> URI -> URI
withExtension ext = set uriTrailingSlash False . over uriPath modLast
  where modLast :: [RText 'PathPiece] -> [RText 'PathPiece]
        modLast [] = []
        modLast [x] = (mkPathPiece . (<> "." <> ext) . unRText) x
        modLast (x:xs) = x : modLast xs

infraAPIJson :: (URI -> URI) -> JSM URI
infraAPIJson f =  (`fmap` infraAPIUrl) $ asJson . f

etj2APIJson :: (URI -> URI) -> JSM URI
etj2APIJson f =  (`fmap` etj2APIUrl) $ asJson . f

rumaAPIJson :: (URI -> URI) -> JSM URI
rumaAPIJson f =  (`fmap` rumaAPIUrl) $ asJson . f

cqlFilter :: Text -> URI -> URI
cqlFilter = over uriQuery . (<>) . mkParam "cql_filter"

propertyName :: Text -> URI -> URI
propertyName = over uriQuery . (<>) . mkParam "propertyName"

state :: Text -> URI -> URI
state = over uriQuery . (<>) . mkParam "state"

typeNames :: Text -> URI -> URI
typeNames = over uriQuery . (<>) . mkParam "typeNames"

duration :: CalendarDiffTime -> URI -> URI
duration = over uriQuery . (<>) . mkParam "duration" . toURIFragment

srsName :: SRSName -> URI -> URI
srsName = over uriQuery . (<>) . mkParam "srsName" . toURIFragment

asInterval :: TimeSetting -> TimeSetting
asInterval (Instant t) = Span (Interval t t)
asInterval x    = x

withTime :: Maybe TimeSetting -> URI -> URI
withTime Nothing = id
withTime (Just ts) =
    over uriQuery (<> mkParam "time" (toURIFragment $ asInterval ts)) .
    over uriQuery (\params -> params^..folded.filtered (not . isTimeParam))

withInfinity :: URI -> URI
withInfinity = withTime (Just $ Span infiniteInterval)

isTimeParam :: QueryParam -> Bool
isTimeParam (QueryFlag key) = unRText key == "time"
isTimeParam (QueryParam key _) = unRText key == "time"




ratanumeroUrl :: Text -> JSM URI
ratanumeroUrl ratanumero = infraAPIJson $
    path "radat" .
    cqlFilter ("ratanumero=" <> ratanumero)

ratanumerotUrl :: JSM URI
ratanumerotUrl = infraAPIJson $
    path "radat" .
    propertyName "ratakilometrit,ratanumero,objektinVoimassaoloaika"

ratakmSijaintiUrl :: Ratakmetaisyys -> JSM URI
ratakmSijaintiUrl Ratakmetaisyys{..} = infraAPIJson $
    path "radat" .
    path ratanumero .
    path (toURIFragment kmetaisyys)

pmSijaintiUrl :: Pmsijainti -> JSM URI
pmSijaintiUrl pmsijainti = infraAPIJson $
    path "paikantamismerkit" .
    path (toURIFragment pmsijainti)

ratakmValiUrl :: Ratakmvali -> JSM URI
ratakmValiUrl (Ratakmvali ratanumero alku loppu) = infraAPIJson $
    path "radat" .
    path ratanumero .
    path (toURIFragment alku <> "-" <> toURIFragment loppu)

liikennepaikkavalitUrl :: JSM URI
liikennepaikkavalitUrl = infraAPIJson $
    path "liikennepaikkavalit" .
    propertyName "alkuliikennepaikka,loppuliikennepaikka,ratakmvalit,objektinVoimassaoloaika,tunniste"

reittiUrl :: NonEmpty OID -> [OID] -> NonEmpty OID -> JSM URI
reittiUrl alku etapit loppu = infraAPIJson $
    path "reitit" .
    path "kaikki" .
    path (toURIFragment alku) .
    if null etapit then id else path (toURIFragment etapit) .
    path (toURIFragment loppu) .
    propertyName "geometria,liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet"

reittihakuUrl :: NonEmpty OID -> [OID] -> NonEmpty OID -> JSM URI
reittihakuUrl alku etapit loppu = infraAPIJson $
    path "reitit" .
    path "kaikki" .
    path (toURIFragment alku) .
    if null etapit then id else path (toURIFragment etapit) .
    path (toURIFragment loppu) .
    propertyName "liikennepaikat,liikennepaikanOsat,seisakkeet,linjavaihteet"





ratapihapalveluTyypitUrl :: JSM URI
ratapihapalveluTyypitUrl = infraAPIJson $
    path "ratapihapalvelutyypit"

opastinTyypitUrl :: JSM URI
opastinTyypitUrl = infraAPIJson $
    path "opastintyypit"

vaihdeTyypitUrl :: JSM URI
vaihdeTyypitUrl = infraAPIJson $
    path "vaihdetyypit"





rautatieliikennepaikatUrl :: JSM URI
rautatieliikennepaikatUrl = infraAPIJson $
    path "rautatieliikennepaikat" .
    propertyName "lyhenne,muutRatakmsijainnit,nimi,ratakmvalit,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika" .
    srsName CRS84

liikennepaikanOsatUrl :: JSM URI
liikennepaikanOsatUrl = infraAPIJson $
    path "liikennepaikanosat" .
    propertyName "liikennepaikka,lyhenne,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti,virallinenSijainti,objektinVoimassaoloaika" .
    srsName CRS84

raideosuudetUrl :: JSM URI
raideosuudetUrl = infraAPIJson $
    path "aikataulupaikat" .
    cqlFilter "tyyppi='raideosuus'" .
    propertyName "geometria,tunniste.tunniste,tunniste.ratakmvalit,tunniste.turvalaiteNimi,tyyppi,uicKoodi,objektinVoimassaoloaika" .
    srsName CRS84

laituritUrl :: JSM URI
laituritUrl = infraAPIJson $
    path "aikataulupaikat" .
    cqlFilter "tyyppi='laituri'" .
    propertyName "geometria,tunniste.tunniste,tunniste.kuvaus,tunniste.ratakmvalit,tunniste.tunnus,tyyppi,uicKoodi,objektinVoimassaoloaika" .
    srsName CRS84




elementitUrl :: JSM URI
elementitUrl = infraAPIJson $
    path "elementit" .
    propertyName "tunniste,nimi,ratakmsijainnit,objektinVoimassaoloaika"

lorajatUrl :: JSM URI
lorajatUrl = infraAPIJson $
    path "liikenteenohjauksenrajat" .
    propertyName "tunniste,leikkaukset.ratakmsijainnit,objektinVoimassaoloaika"

raiteenKorkeudetUrl :: OID -> JSM URI
raiteenKorkeudetUrl raide = infraAPIJson $
    path "raiteet" .
    path (toURIFragment raide) .
    propertyName "korkeuspisteet,ratakmvalit,tunnus"




eiUrlRatanumero :: EITila -> JSM URI
eiUrlRatanumero tila = etj2APIJson $
    path "ennakkoilmoitukset" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "tunniste,leikkaukset.ratakmsijainnit,objektinVoimassaoloaika"

esUrlRatanumero :: ESTila -> JSM URI
esUrlRatanumero tila = etj2APIJson $
    path "ennakkosuunnitelmat" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa"

vsUrlRatanumero :: VSTila -> JSM URI
vsUrlRatanumero tila = etj2APIJson $
    path "vuosisuunnitelmat" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa"

loUrlRatanumero :: VSTila -> JSM URI
loUrlRatanumero tila = etj2APIJson $
    path "loilmoitukset" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika"




eiUrlAikataulupaikka :: EITila -> JSM URI
eiUrlAikataulupaikka tila = etj2APIJson $
    path "ennakkoilmoitukset" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "ajankohdat,liikennevaikutusalue.laskennallisetRatakmvalit,sisainenTunniste,tunniste,voimassa"

esUrlAikataulupaikka :: ESTila -> JSM URI
esUrlAikataulupaikka tila = etj2APIJson $
    path "ennakkosuunnitelmat" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "sisainenTunniste,tyonosat.ajankohdat,tyonosat.tekopaikka.laskennallisetRatakmvalit,tunniste,voimassa"

vsUrlAikataulupaikka :: VSTila -> JSM URI
vsUrlAikataulupaikka tila = etj2APIJson $
    path "vuosisuunnitelmat" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "ajankohdat,sisainenTunniste,tunniste,kohde.laskennallisetRatakmvalit,voimassa"

loUrlAikataulupaikka :: VSTila -> JSM URI
loUrlAikataulupaikka tila = etj2APIJson $
    path "loilmoitukset" .
    cqlFilter ("tila='" <> toURIFragment tila <> "'") .
    propertyName "ensimmainenAktiivisuusaika,ratakmvalit,sisainenTunniste,tunniste,viimeinenAktiivisuusaika"



kunnossapitoalueetMetaUrl :: JSM URI
kunnossapitoalueetMetaUrl = infraAPIJson $
    path "kunnossapitoalueet" .
    propertyName "nimi,objektinVoimassaoloaika,tunniste" .
    withInfinity

liikenteenohjausalueetMetaUrl :: JSM URI
liikenteenohjausalueetMetaUrl = infraAPIJson $
    path "liikenteenohjausalueet" .
    propertyName "nimi,objektinVoimassaoloaika,tunniste" .
    withInfinity

kayttokeskuksetMetaUrl :: JSM URI
kayttokeskuksetMetaUrl = infraAPIJson $
    path "kayttokeskukset" .
    propertyName "nimi,objektinVoimassaoloaika,tunniste" .
    withInfinity

liikennesuunnittelualueetMetaUrl :: JSM URI
liikennesuunnittelualueetMetaUrl = infraAPIJson $
    path "liikennesuunnittelualueet" .
    propertyName "nimi,objektinVoimassaoloaika,tunniste" .
    withInfinity





ratapihapalvelutUrlTilasto :: JSM URI
ratapihapalvelutUrlTilasto = infraAPIJson $
    path "ratapihapalvelut" .
    propertyName "objektinVoimassaoloaika,tunniste,tyyppi" .
    withInfinity

toimialueetUrlTilasto :: JSM URI
toimialueetUrlTilasto = infraAPIJson $
    path "toimialueet" .
    propertyName "liikenteenohjausalue,objektinVoimassaoloaika,tunniste" .
    withInfinity

tilirataosatUrlTilasto :: JSM URI
tilirataosatUrlTilasto = infraAPIJson $
    path "tilirataosat" .
    propertyName "kunnossapitoalue,objektinVoimassaoloaika,tunniste" .
    withInfinity

liikennesuunnittelualueetUrlTilasto :: JSM URI
liikennesuunnittelualueetUrlTilasto = infraAPIJson $
    path "liikennesuunnittelualueet" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

paikantamismerkitUrlTilasto :: JSM URI
paikantamismerkitUrlTilasto = infraAPIJson $
    path "paikantamismerkit" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

kilometrimerkitUrlTilasto :: JSM URI
kilometrimerkitUrlTilasto = infraAPIJson $
    path "kilometrimerkit" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

radatUrlTilasto :: JSM URI
radatUrlTilasto = infraAPIJson $
    path "radat" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

liikennepaikanOsatUrlTilasto :: JSM URI
liikennepaikanOsatUrlTilasto = infraAPIJson $
    path "liikennepaikanosat" .
    propertyName "liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste" .
    withInfinity

rautatieliikennepaikatUrlTilasto :: JSM URI
rautatieliikennepaikatUrlTilasto = infraAPIJson $
    path "rautatieliikennepaikat" .
    propertyName "liikennesuunnittelualueet,objektinVoimassaoloaika,tunniste,tyyppi" .
    withInfinity

liikennepaikkavalitUrlTilasto :: JSM URI
liikennepaikkavalitUrlTilasto = infraAPIJson $
    path "liikennepaikkavalit" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

raideosuudetUrlTilasto :: JSM URI
raideosuudetUrlTilasto = infraAPIJson $
    path "raideosuudet" .
    propertyName "objektinVoimassaoloaika,tunniste,tyyppi" .
    withInfinity

elementitUrlTilasto :: ElementtiTypeName -> JSM URI
elementitUrlTilasto typeN = infraAPIJson $
    path "elementit" .
    typeNames (toURIFragment typeN) .
    propertyName (elementtiTilastoPropertyNames typeN) .
    withInfinity
  where
    elementtiTilastoPropertyNames :: ElementtiTypeName -> Text
    elementtiTilastoPropertyNames Baliisi         = "baliisi.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste"
    elementtiTilastoPropertyNames Opastin         = "opastin.tyyppi,kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste"
    elementtiTilastoPropertyNames Pysaytyslaite   = "kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,pysaytyslaite.kasinAsetettava,pysaytyslaite.varmuuslukittu,tunniste"
    elementtiTilastoPropertyNames Ryhmityseristin = "kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,ryhmityseristin.nopeastiAjettava,tunniste"
    elementtiTilastoPropertyNames _               = "kayttokeskukset,liikennesuunnittelualue,objektinVoimassaoloaika,tunniste"

raiteensulutUrlTilasto :: JSM URI
raiteensulutUrlTilasto = infraAPIJson $
    path "raiteensulut" .
    propertyName "kasinAsetettava,objektinVoimassaoloaika,tunniste,varmuuslukittu" .
    withInfinity

raiteetUrlTilasto :: JSM URI
raiteetUrlTilasto = infraAPIJson $
    path "raiteet" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

liikenteenohjauksenrajatUrlTilasto :: JSM URI
liikenteenohjauksenrajatUrlTilasto = infraAPIJson $
    path "liikenteenohjauksenrajat" .
    propertyName "ensimmaisenLuokanAlueidenRaja,objektinVoimassaoloaika,tunniste" .
    withInfinity

tunnelitUrlTilasto :: JSM URI
tunnelitUrlTilasto = infraAPIJson $
    path "tunnelit" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

sillatUrlTilasto :: JSM URI
sillatUrlTilasto = infraAPIJson $
    path "sillat" .
    propertyName "kayttotarkoitus,objektinVoimassaoloaika,tunniste" .
    withInfinity

laituritUrlTilasto :: JSM URI
laituritUrlTilasto = infraAPIJson $
    path "laiturit" .
    propertyName "korkeus,objektinVoimassaoloaika,tunniste,tyyppi" .
    withInfinity

tasoristeyksetUrlTilasto :: JSM URI
tasoristeyksetUrlTilasto = infraAPIJson $
    path "tasoristeykset" .
    propertyName "kayttokeskukset,objektinVoimassaoloaika,tielaji,tunniste,varoituslaitos" .
    withInfinity

kayttokeskuksetUrlTilasto :: JSM URI
kayttokeskuksetUrlTilasto = infraAPIJson $
    path "kayttokeskukset" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity

kytkentaryhmatUrlTilasto :: JSM URI
kytkentaryhmatUrlTilasto = infraAPIJson $
    path "kytkentaryhmat" .
    propertyName "objektinVoimassaoloaika,tunniste" .
    withInfinity





asiatUrl :: JSM URI
asiatUrl = etj2APIJson $
    path "asiat"

esTyypitUrl :: JSM URI
esTyypitUrl = etj2APIJson $
    path "ennakkosuunnitelmatyypit"

loUrlTilasto :: JSM URI
loUrlTilasto = etj2APIJson $
    path "loilmoitukset" .
    propertyName "ensimmainenAktiivisuusaika,luontiaika,tila,tunniste,tyyppi,viimeinenAktiivisuusaika" .
    withInfinity

eiUrlTilasto :: JSM URI
eiUrlTilasto = etj2APIJson $
    path "ennakkoilmoitukset" .
    propertyName "asia,luontiaika,tila,tunniste,tyyppi,voimassa" .
    withInfinity

esUrlTilasto :: JSM URI
esUrlTilasto = etj2APIJson $
    path "ennakkosuunnitelmat" .
    propertyName "luontiaika,tila,tunniste,tyyppi,voimassa" .
    withInfinity

vsUrlTilasto :: JSM URI
vsUrlTilasto = etj2APIJson $
    path "vuosisuunnitelmat" .
    propertyName "alustavakapasiteettivaraus,luontiaika,tila,tunniste,tyo,tyonlaji,voimassa" .
    withInfinity



luotujaPoistuneitaInfraUrl :: Text -> Text -> CalendarDiffTime -> Maybe ElementtiTypeName -> JSM URI
luotujaPoistuneitaInfraUrl cql p dur typeN = (`fmap` baseInfraAPIUrl True) $ asJson .
    path p .
    cqlFilter cql .
    duration dur .
    propertyName "objektinVoimassaoloaika,tunniste" .
    maybe id (typeNames . toURIFragment) typeN

luotujaInfraUrl :: Text -> CalendarDiffTime -> Maybe ElementtiTypeName -> JSM URI
luotujaInfraUrl = luotujaPoistuneitaInfraUrl "start(objektinVoimassaoloaika)>=start(time) AND start(objektinVoimassaoloaika)<end(time)"

poistuneitaInfraUrl :: Text -> CalendarDiffTime -> Maybe ElementtiTypeName -> JSM URI
poistuneitaInfraUrl = luotujaPoistuneitaInfraUrl "end(objektinVoimassaoloaika)>=start(time) AND end(objektinVoimassaoloaika)<end(time)"

data Muutokset = Muutokset {
    nimi :: Text,
    luotuja :: URI,
    poistuneita :: URI
}

instance ToJSVal Muutokset where
    toJSVal (Muutokset{..}) = do
        o <- create
        o <# ("nimi" :: JSString) $ toJSVal nimi
        o <# ("luotuja" :: JSString) $ toJSVal luotuja
        o <# ("poistuneita" :: JSString) $ toJSVal poistuneita
        toJSVal o

infraMuutoksetUrl :: Text -> Text -> Maybe ElementtiTypeName -> CalendarDiffTime -> JSM Muutokset
infraMuutoksetUrl name p typeN dur = do
    luotuja <- luotujaInfraUrl p dur typeN
    poistuneita <- poistuneitaInfraUrl p dur typeN
    pure $ Muutokset name luotuja poistuneita

muutoksetInfra :: CalendarDiffTime -> JSM [Muutokset]
muutoksetInfra d = traverse ($ d)
    [ infraMuutoksetUrl "Ratapihapalvelut" "ratapihapalvelut" Nothing
    , infraMuutoksetUrl "Toimialueet" "toimialueet" Nothing
    , infraMuutoksetUrl "Tilirataosat" "tilirataosat" Nothing
    , infraMuutoksetUrl "Liikennesuunnittelualueet" "liikennesuunnittelualueet" Nothing
    , infraMuutoksetUrl "Paikantamismerkit" "paikantamismerkit" Nothing
    , infraMuutoksetUrl "Kilometrimerkit" "kilometrimerkit" Nothing
    , infraMuutoksetUrl "Radat" "radat" Nothing
    , infraMuutoksetUrl "Liikennepaikanosat" "liikennepaikanosat" Nothing
    , infraMuutoksetUrl "Rautatieliikennepaikat" "rautatieliikennepaikat" Nothing
    , infraMuutoksetUrl "Liikennepaikkavalit" "liikennepaikkavalit" Nothing
    , infraMuutoksetUrl "Raideosuudet" "raideosuudet" Nothing
    , infraMuutoksetUrl "Akselinlaskijat" "elementit" (Just Akselinlaskija)
    , infraMuutoksetUrl "Baliisit" "elementit" (Just Baliisi)
    , infraMuutoksetUrl "Kuumakäynti-ilmaisimet" "elementit" (Just Kuumakayntiilmaisin)
    , infraMuutoksetUrl "Liikennepaikan rajat" "elementit" (Just Liikennepaikanraja)
    , infraMuutoksetUrl "Opastimet" "elementit" (Just Opastin)
    , infraMuutoksetUrl "Puskimet" "elementit" (Just Puskin)
    , infraMuutoksetUrl "Pyörävoimailmaisimet" "elementit" (Just Pyoravoimailmaisin)
    , infraMuutoksetUrl "Raide-eristykset" "elementit" (Just Raideeristys)
    , infraMuutoksetUrl "Pysäytyslaitteet" "elementit" (Just Pysaytyslaite)
    , infraMuutoksetUrl "RFID-lukijat" "elementit" (Just Rfidlukija)
    , infraMuutoksetUrl "Ryhmityseristimet" "elementit" (Just Ryhmityseristin)
    , infraMuutoksetUrl "Sähköistys päättyy" "elementit" (Just Sahkoistyspaattyy)
    , infraMuutoksetUrl "Seislevyt" "elementit" (Just Seislevy)
    , infraMuutoksetUrl "Vaihteet" "elementit" (Just Vaihde)
    , infraMuutoksetUrl "Virroitinvalvontakamerat" "elementit" (Just Virroitinvalvontakamera)
    , infraMuutoksetUrl "Erotusjaksot" "elementit" (Just Erotusjakso)
    , infraMuutoksetUrl "Erotuskentät" "elementit" (Just Erotuskentta)
    , infraMuutoksetUrl "Maadoittimet" "elementit" (Just Maadoitin)
    , infraMuutoksetUrl "Työnaikaiset eristimet" "elementit" (Just Tyonaikaineneristin)
    , infraMuutoksetUrl "Kääntöpöydät" "elementit" (Just Kaantopoyta)
    , infraMuutoksetUrl "Pyöräprofiilin mittalaitteet" "elementit" (Just Pyoraprofiilimittalaite)
    , infraMuutoksetUrl "Telivalvonnat" "elementit" (Just Telivalvonta)
    , infraMuutoksetUrl "Erottimet" "elementit" (Just Erotin)
    , infraMuutoksetUrl "Tasoristeysvalojen pyörätunnistimet" "elementit" (Just Tasoristeysvalojenpyoratunnistin)
    , infraMuutoksetUrl "Raiteensulut" "raiteensulut" Nothing
    , infraMuutoksetUrl "Raiteet" "raiteet" Nothing
    , infraMuutoksetUrl "Liikenteenohjauksen rajat" "liikenteenohjauksenrajat" Nothing
    , infraMuutoksetUrl "Tunnelit" "tunnelit" Nothing
    , infraMuutoksetUrl "Sillat" "sillat" Nothing
    , infraMuutoksetUrl "Laiturit" "laiturit" Nothing
    , infraMuutoksetUrl "Tasoristeykset" "tasoristeykset" Nothing
    , infraMuutoksetUrl "Käyttökeskukset" "kayttokeskukset" Nothing
    , infraMuutoksetUrl "Kytkentäryhmät" "kytkentaryhmat" Nothing
    ]

muutoksetEtj2 :: CalendarDiffTime -> JSM [Muutokset]
muutoksetEtj2 d = traverse ($ d)
    [ etj2MuutoksetUrl "Ennakkoilmoitukset" "ennakkoilmoitukset"
    , etj2MuutoksetUrl "Ennakkosuunnitelmat" "ennakkosuunnitelmat"
    , etj2MuutoksetUrl "Vuosisuunnitelmat" "vuosisuunnitelmat"
    ]

luotujaPoistuneitaEtj2Url :: Text -> Text -> CalendarDiffTime -> JSM URI
luotujaPoistuneitaEtj2Url cql p dur = (`fmap` baseEtj2APIUrl True) $ asJson .
    path p .
    cqlFilter cql .
    duration dur .
    propertyName "objektinVoimassaoloaika,tunniste"

luotujaEtj2Url :: Text -> CalendarDiffTime -> JSM URI
luotujaEtj2Url = luotujaPoistuneitaEtj2Url "start(voimassa)>=start(time)+AND+start(voimassa)<end(time)"

poistuneitaEtj2Url :: Text -> CalendarDiffTime -> JSM URI
poistuneitaEtj2Url = luotujaPoistuneitaEtj2Url "end(voimassa)>=start(time)+AND+end(voimassa)<end(time)"

etj2MuutoksetUrl :: Text -> Text -> CalendarDiffTime -> JSM Muutokset
etj2MuutoksetUrl name p dur = do
    luotuja <- luotujaEtj2Url p dur
    poistuneita <- poistuneitaEtj2Url p dur
    pure $ Muutokset name luotuja poistuneita





junasijainnitUrl :: URI
junasijainnitUrl = [uri|https://rata.digitraffic.fi/api/v1/train-locations/latest/|]

junasijainnitGeojsonUrl :: URI
junasijainnitGeojsonUrl = [uri|https://rata.digitraffic.fi/api/v1/train-locations/latest.geojson/|]




koordinaattiUrl :: Point -> Maybe SRSName -> JSM URI
koordinaattiUrl c srs = infraAPIJson $
    path "koordinaatit" .
    path (toURIFragment c) .
    maybe id srsName srs

ratakmMuunnosUrl :: Point -> JSM URI
ratakmMuunnosUrl c = infraAPIJson $
    path "koordinaatit" .
    path (toURIFragment c) .
    propertyName "ratakmsijainnit,haetunDatanVoimassaoloaika" .
    srsName CRS84

koordinaattiMuunnosUrl :: Ratakmetaisyys -> JSM URI
koordinaattiMuunnosUrl (Ratakmetaisyys ratanumero kme) = (`fmap` infraAPIUrl) $ withExtension "geojson" .
    path "radat" .
    path (toURIFragment ratanumero) .
    path (toURIFragment kme) .
    propertyName "geometria,haetunDatanVoimassaoloaika" .
    srsName CRS84



rtUrl :: Maybe RTTila -> JSM URI
rtUrl tila = rumaAPIJson $
    path "trackwork-notifications" .
    maybe id (state . toURIFragment) tila

rtGeojsonUrl :: Maybe RTTila -> JSM URI
rtGeojsonUrl = fmap (withExtension "geojson") . rtUrl

rtSingleUrl :: OID -> JSM URI
rtSingleUrl tunniste = rumaAPIJson $
    path "trackwork-notifications" .
    path (toURIFragment tunniste) .
    path "latest"

lrUrl :: Maybe RTTila -> JSM URI
lrUrl tila = rumaAPIJson $
    path "trafficrestriction-notifications" .
    maybe id (state . toURIFragment) tila

lrGeojsonUrl :: Maybe RTTila -> JSM URI
lrGeojsonUrl = fmap (withExtension "geojson") . rtUrl

lrSingleUrl :: OID -> JSM URI
lrSingleUrl tunniste = rumaAPIJson $
    path "trafficrestriction-notifications" .
    path (toURIFragment tunniste) .
    path "latest"

infraObjektityypitUrl :: JSM URI
infraObjektityypitUrl = (`fmap` baseInfraAPIUrl True) $ asJson .
    path "objektityypit"

hakuUrlitInfra :: JSM [URI]
hakuUrlitInfra = traverse infraAPIJson [
    path "ratapihapalvelut" . propertyName "kuvaus,nimi,ratakmsijainnit,sahkokeskus.sahkokeskustyyppi,tunniste,tyyppi"
  , path "toimialueet" . propertyName "nimi,rttunnusvali,tunniste,valit.ratakmvali"
  , path "tilirataosat" . propertyName "nimi,numero,ratakmvalit,tunniste"
  , path "liikennesuunnittelualueet" . propertyName "nimi,tunniste"
  , path "paikantamismerkit" . propertyName "liikennepaikkavalit,numero,ratakmsijainnit,rautatieliikennepaikka,tunniste"
  , path "kilometrimerkit" . propertyName "ratakm,ratanumero,tunniste"
  , path "radat" . propertyName "ratanumero,tunniste"
  , path "liikennepaikanosat" . propertyName "kuljettajaAikatauluNimi,liikennepaikka,lyhenne,maakoodi,muutRatakmsijainnit,nimi,tunniste,uicKoodi,virallinenRatakmsijainti"
  , path "rautatieliikennepaikat" . propertyName "kuljettajaAikatauluNimi,lyhenne,muutRatakmsijainnit,nimi,paaristeysasema,tunniste,tyyppi,uicKoodi,virallinenRatakmsijainti"
  , path "liikennepaikkavalit" . propertyName "alkuliikennepaikka,loppuliikennepaikka,tunniste"
  , path "raideosuudet" . propertyName "kaukoOhjausTunnisteet,liikennepaikkavalit,rautatieliikennepaikat,tunniste,turvalaiteNimi,turvalaiteRaide,tyyppi,uicKoodi"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "akselinlaskija"
  , path "elementit" . propertyName "baliisi,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "baliisi"
  , path "elementit" . propertyName "kuumakayntiIlmaisin,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "kuumakayntiilmaisin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "liikennepaikanraja"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,opastin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "opastin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "puskin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,pyoravoimailmaisin,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "pyoravoimailmaisin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "raideeristys"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,pysaytyslaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "pysaytyslaite"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,rfidLukija,tunniste,tyyppi" . typeNames "rfidlukija"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,ryhmityseristin,tunniste,tyyppi" . typeNames "ryhmityseristin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,sahkoistysPaattyy,tunniste,tyyppi" . typeNames "sahkoistyspaattyy"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "seislevy"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,vaihde" . typeNames "vaihde"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi,virroitinvalvontakamera" . typeNames "virroitinvalvontakamera"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "erotusjakso"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "erotuskentta"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "maadoitin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "tyonaikaineneristin"
  , path "elementit" . propertyName "kaantopoyta,kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "kaantopoyta"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,pyoraprofiiliMittalaite,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "pyoraprofiilimittalaite"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,telivalvonta,tunniste,tyyppi" . typeNames "telivalvonta"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "erotin"
  , path "elementit" . propertyName "kuvaus,liikennepaikkavali,nimi,ratakmsijainnit,rautatieliikennepaikat,tunniste,tyyppi" . typeNames "tasoristeysvalojenpyoratunnistin"
  , path "raiteensulut" . propertyName "kasinAsetettava,nimi,tunniste,varmuuslukittu"
  , path "raiteet" . propertyName "kaupallinenNumero,kayttotarkoitukset,kuvaus,liikennepaikkavalit,linjaraidetunnukset,nopeusrajoitukset,rautatieliikennepaikat,tunniste,tunnus"
  , path "liikenteenohjauksenrajat" . propertyName "ensimmaisenLuokanAlueidenRaja,leikkaukset.ratakmsijainnit,tunniste"
  , path "tunnelit" . propertyName "nimi,tunniste"
  , path "sillat" . propertyName "kayttotarkoitus,nimi,ratakmvalit,siltakoodi,tunniste"
  , path "laiturit" . propertyName "kaupallinenNumero,kuvaus,liikennepaikanOsa,ratakmvalit,rautatieliikennepaikka,tunniste,tunnus,uicKoodi"
  , path "tasoristeykset" . propertyName "liikennepaikkavalit,nimi,rautatieliikennepaikat,tielaji,tunniste,tunnus,varoituslaitos,virallinenSijainti"
  , path "kytkentaryhmat" . propertyName "numero,rautatieliikennepaikat,tunniste"
  ]

hakuUrlitEtj2 :: JSM [URI]
hakuUrlitEtj2 = traverse etj2APIJson [
      path "vuosisuunnitelmat" . propertyName "alustavakapasiteettivaraus,liikennehaitta,liikennejarjestelyt,liikennerajoitteenLisatiedot,liikennerajoitteet,myohastymisvaikutus,sisainenTunniste,tila,tunniste,tyo,tyonlaji,tyonLisatiedot,urakoitsija.urakoitsija,voimassa"
    , path "ennakkosuunnitelmat" . propertyName "kuvaus,organisaatio,projektinumerot,sisainenTunniste,tila,tilanLisatiedot,tunniste,tyyppi,tyonosat.alustavaKapasiteettirajoite,tyonosat.nopeusrajoitus,tyonosat.selite,tyonosat.tyyppi,urakoitsija.urakoitsija,voimassa"
    , path "ennakkoilmoitukset" . propertyName "asia,eivekSelite,muutostyyppi,nopeusrajoitus,sisainenTunniste,suunta,symbolit,tila,tunniste,tyyppi,vekSelite,voimassa"
    , path "loilmoitukset" . propertyName "sisainenTunniste,tila,toimitustapa,tunniste,tyyppi"
    ]

hakuUrlitRuma :: [URI]
hakuUrlitRuma = [
      [uri|https://rata.digitraffic.fi/api/v1/trackwork-notifications.json|]
    , [uri|https://rata.digitraffic.fi/api/v1/trafficrestriction-notifications.json|]
    ]

