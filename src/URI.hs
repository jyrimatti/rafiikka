{-# LANGUAGE QuasiQuotes #-}
{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
module URI where

import Universum hiding (local)
import Text.URI (mkURI, URI, mkPathPiece, mkQueryKey, mkQueryValue, QueryParam (QueryParam, QueryFlag), unRText, RText, RTextLabel (PathPiece))
import Text.URI.Lens (uriPath, uriQuery, uriTrailingSlash)
import Text.URI.QQ
import Browser
import JSDOM.Types (JSM)
import JSDOM (currentWindow)
import Language.Javascript.JSaddle ((!), create, (<#))
import Language.Javascript.JSaddle.Classes (FromJSVal(fromJSVal))
import Data.Maybe (fromJust)
import Types (Train (Train, departureDate, trainNumber), Revisions (infra, etj2), Ratakmetaisyys (Ratakmetaisyys, kmetaisyys, ratanumero), Pmsijainti, Ratakmvali (Ratakmvali), OID, SRSName (CRS84), EITila, ESTila, VSTila, ElementtiTypeName (..))
import URISerialization (ToURIFragment(toURIFragment))
import Time (Interval (Interval), roundToPreviousMonth, roundToNextMonth, roundToPreviousDay, infiniteInterval)
import StateAccessor (getMainState)
import State (AppState(AppState, timeSetting), roundTimeSettingToPreviousDay, TimeSetting (Span, Instant), toInterval)
import Control.Lens (filtered, folded)
import Data.Time (CalendarDiffTime)
import Language.Javascript.JSaddle.Value

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

-- Infra-API URL with time
infraAPIUrl :: JSM URI
infraAPIUrl = over uriQuery . (<>) <$> infraInterval <*> baseInfraAPIUrl False

-- Etj2-API URL with time
etj2APIUrl :: JSM URI
etj2APIUrl = over uriQuery . (<>) <$> etj2Interval <*> baseEtj2APIUrl False

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
asJson = set uriTrailingSlash False . over uriPath modLast
  where modLast :: [RText 'PathPiece] -> [RText 'PathPiece]
        modLast [] = []
        modLast [x] = (mkPathPiece . (<> ".json") . unRText) x
        modLast (x:xs) = x : modLast xs

infraAPIJson :: (URI -> URI) -> JSM URI
infraAPIJson f =  (`fmap` infraAPIUrl) $ asJson . f

etj2APIJson :: (URI -> URI) -> JSM URI
etj2APIJson f =  (`fmap` etj2APIUrl) $ asJson . f

cqlFilter :: Text -> URI -> URI
cqlFilter = over uriQuery . (<>) . mkParam "cql_filter"

propertyName :: Text -> URI -> URI
propertyName = over uriQuery . (<>) . mkParam "propertyName"

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