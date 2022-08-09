{-# LANGUAGE QuasiQuotes #-}
{-# OPTIONS_GHC -Wno-unrecognised-pragmas #-}
{-# HLINT ignore "Use camelCase" #-}
{-# LANGUAGE PartialTypeSignatures #-}
{-# LANGUAGE TypeApplications #-}
module Match where

import Universum hiding (takeWhile)
import Types (OID (OID, oid), FintrafficSystem (Infra, Jeti, Ruma), mkFintrafficSystem, VaylaSystem (Trex), mkVaylaSystem, Point (Point), Ratakmetaisyys (Ratakmetaisyys), Kmetaisyys (Kmetaisyys), Distance (Distance), Pmsijainti (Pmsijainti), Direction (Inc, Dec), Ratakmvali (Ratakmvali), Route (Route), Train (Train), GeometryType)
import Text.RE.TDFA.Text ( re, RE, (=~~), (?=~) )
import Text.RE.Replace ( captureTextMaybe )
import Data.Text (unpack, takeWhile, splitOn)
import Text.RE.TDFA (cp)
import Data.Maybe (fromJust)
import Infra.Types ( InfraType, findInfraType )
import Jeti.Types (findJetiType, JetiType (LOilmoitus, Ennakkoilmoitus, Ennakkosuunnitelma, Vuosisuunnitelma), findJetiTypeByShortName)
import Ruma.Types (findRumaType, RumaType (Ratatyoilmoitus, Liikenteenrajoite), findRumaTypeByShortName)
import Trex.Types (findTrexType, TrexType)
import Yleiset (anyOf)
import Time (parseISO)

regex_oid :: RE
regex_oid = [re|^([0-9]+\.)+[0-9]+$|]

regex_knownOid :: RE
regex_knownOid = [re|^1\.2\.246\.${org}(586|578)\.${systemId}([0-9]+)\.${subsystemId}([0-9]+(\.[0-9]+)*)$|]

regex_coordinate :: RE
regex_coordinate = [re|^${x}(([0-9]+)(\.[0-9]+)?),[ ]?${y}(([0-9]+)(\.[0-9]+)?)$|]

regex_ratakmetaisyys :: RE
regex_ratakmetaisyys = [re|^\(${ratanumero}([^)]+)\)\s*${ratakm}([0-9]+)\+${etaisyys}([0-9]+)$|]

regex_ratakmvali :: RE
regex_ratakmvali = [re|^\(${ratanumero}([^)]+)\)\s*${alkuratakm}([0-9]+)\+${alkuetaisyys}([0-9]+)-${loppuratakm}([0-9]+)\+${loppuetaisyys}([0-9]+)$|]

regex_ratanumero :: RE
regex_ratanumero = [re|^\(${ratanumero}([a-zA-Z0-9 ]+|[^a-zA-Z0-9 ]{1,6}([^a-zA-Z0-9 ]{1,3})?)\)$|]

regex_pmsijainti :: RE
regex_pmsijainti = [re|^${numero}([0-9]+)${suunta}([+-])${etaisyys}([0-9]+)$|]

regex_reitti :: RE
regex_reitti = [re|^${alku}([^=]*)\s*${vali}((=>.*)*\s*)=>\s*${loppu}([^=]*)$|]

regex_jetiSisainen :: RE
regex_jetiSisainen = [re|^${tyyppi}(EI|ES|VS|LOI)${id}([0-9]+)$|]

regex_rumaSisainen :: RE
regex_rumaSisainen = [re|^${tyyppi}(RT|LR)${id}([0-9]+)$|]

regex_train :: RE
regex_train = [re|^${departureDate}([0-9]{4}-[0-9]{2}-[0-9]{2})\s*\(?${trainNumber}(\d+)\)?$|]

regex_wkt :: RE
regex_wkt = [re|^${tyyppi}(POINT|LINESTRING|POLYGON|MULTIPOINT|MULTILINESTRING|MULTIPOLYGON|GEOMETRYCOLLECTION)(.*)$|]



-- | fintrafficJarjestelma
-- >>> fintrafficJarjestelma (OID "1.2.246.586.1.1")
-- Just Infra
fintrafficJarjestelma :: OID -> Maybe FintrafficSystem
fintrafficJarjestelma = mkFintrafficSystem <=< readMaybe . unpack <=< (captureTextMaybe [cp|systemId|] . (?=~ regex_knownOid) . oid)

vaylaJarjestelma :: OID -> Maybe VaylaSystem
vaylaJarjestelma = mkVaylaSystem <=< readMaybe . unpack <=< (captureTextMaybe [cp|systemId|] . (?=~ regex_knownOid) . oid)


-- | subsystemId
-- >>> subsystemId (OID "1.2.246.586.1.1")
-- "1"
-- >>> subsystemId (OID "1.2.246.586.1.2.3.4.5")
-- "2.3.4.5"
subsystemId :: OID -> Text
subsystemId = fromJust . (captureTextMaybe [cp|subsystemId|] . (?=~ regex_knownOid) . oid)




-- | onkoOID
-- >>> onkoOID "1.2.a"
-- Nothing
-- >>> oid <$> onkoOID "1.2.246.586.1.1"
-- Just "1.2.246.586.1.1"
onkoOID :: Text -> Maybe OID
onkoOID = fmap OID . (=~~ regex_oid)

-- | onkoInfraOID
-- >>> onkoInfraOID $ OID "1.2.246.586.1.40.3"
-- Just Liikennepaikkavali
onkoInfraOID :: OID -> Maybe InfraType
onkoInfraOID x = do
    guard $ fintrafficJarjestelma x == Just Infra
    ret <- readMaybe . unpack . takeWhile (/= '.') . subsystemId $ x
    findInfraType ret

onkoJetiOID :: OID -> Maybe JetiType
onkoJetiOID x = do
    guard $ fintrafficJarjestelma x == Just Jeti
    ret <- readMaybe . unpack . takeWhile (/= '.') . subsystemId $ x
    findJetiType ret

onkoRumaOID :: OID -> Maybe RumaType
onkoRumaOID x = do
    guard $ fintrafficJarjestelma x == Just Ruma
    ret <- readMaybe . unpack . takeWhile (/= '.') . subsystemId $ x
    findRumaType ret

onkoTREXOID :: OID -> Maybe TrexType
onkoTREXOID x = do
    guard $ vaylaJarjestelma x == Just Trex
    ret <- readMaybe . unpack . takeWhile (/= '.') . subsystemId $ x
    findTrexType ret




onkoKoordinaatti :: Text -> Maybe Point
onkoKoordinaatti = (liftA2 Point <$> (readMaybe . unpack <=< captureTextMaybe [cp|x|])
                                 <*> (readMaybe . unpack <=< captureTextMaybe [cp|y|])) . (?=~ regex_coordinate)

onkoRatakmSijainti :: Text -> Maybe Ratakmetaisyys
onkoRatakmSijainti = (liftA3 (\ratanumero ratakm etaisyys -> Ratakmetaisyys ratanumero (Kmetaisyys ratakm etaisyys))
    <$>                                         captureTextMaybe [cp|ratanumero|]
    <*> (                readMaybe . unpack <=< captureTextMaybe [cp|ratakm|])
    <*> (fmap Distance . readMaybe . unpack <=< captureTextMaybe [cp|etaisyys|])) . (?=~ regex_ratakmetaisyys)

onkoPmSijainti :: Text -> Maybe Pmsijainti
onkoPmSijainti = (liftA3 Pmsijainti
    <$> (                readMaybe . unpack <=< captureTextMaybe [cp|numero|])
    <*> (toDirection                        <=< captureTextMaybe [cp|suunta|])
    <*> (fmap Distance . readMaybe . unpack <=< captureTextMaybe [cp|etaisyys|])) . (?=~ regex_pmsijainti)
    where toDirection :: Text -> Maybe Direction
          toDirection "+" = Just Inc
          toDirection "-" = Just Dec
          toDirection _   = Nothing

onkoRatakmVali :: Text -> Maybe Ratakmvali
onkoRatakmVali = (liftM5 (\ratanumero alkuratakm alkuetaisyys loppuratakm loppuetaisyys -> Ratakmvali ratanumero (Kmetaisyys alkuratakm alkuetaisyys) (Kmetaisyys loppuratakm loppuetaisyys))
    <$>                                         captureTextMaybe [cp|ratanumero|]
    <*> (                readMaybe . unpack <=< captureTextMaybe [cp|alkuratakm|])
    <*> (fmap Distance . readMaybe . unpack <=< captureTextMaybe [cp|alkuetaisyys|])
    <*> (                readMaybe . unpack <=< captureTextMaybe [cp|loppuratakm|])
    <*> (fmap Distance . readMaybe . unpack <=< captureTextMaybe [cp|loppuetaisyys|])) . (?=~ regex_ratakmvali)

onkoRatanumero :: Text -> Maybe Text
onkoRatanumero = captureTextMaybe [cp|ratanumero|] . (?=~ regex_ratanumero)

onkoReitti :: Text -> Maybe Route
onkoReitti x = do
    m <- x =~~ regex_reitti
    a <- captureTextMaybe [cp|alku|] m
    v <- captureTextMaybe [cp|vali|] m
    l <- captureTextMaybe [cp|loppu|] m
    pure $ Route a (splitOn "=>" v) l

onkoInfra :: Text -> Bool
onkoInfra = anyOf
    <$> isJust . (onkoInfraOID <=< onkoOID)
    <*> isJust . onkoReitti
    <*> isJust . onkoRatanumero
    <*> isJust . onkoRatakmSijainti
    <*> isJust . onkoRatakmVali
    <*> isJust . onkoKoordinaatti
    <*> isJust . onkoPmSijainti

onkoJeti :: Text -> Maybe JetiType
onkoJeti = (<|>) <$> (onkoJetiOID <=< onkoOID)
                 <*> (findJetiTypeByShortName <=< captureTextMaybe [cp|tyyppi|] . (?=~ regex_jetiSisainen))

onkoRuma :: Text -> Maybe RumaType
onkoRuma = (<|>) <$> (onkoRumaOID <=< onkoOID)
                 <*> (findRumaTypeByShortName <=< captureTextMaybe [cp|tyyppi|] . (?=~ regex_rumaSisainen))

onkoJuna :: Text -> Maybe Train
onkoJuna = (liftA2 Train
    <$> (parseISO           <=< captureTextMaybe [cp|departureDate|])
    <*> (readMaybe . unpack <=< captureTextMaybe [cp|trainNumber|])) . (?=~ regex_train)

onkoEI, onkoES, onkoVS, onkoLOI, onkoRT, onkoLR :: Text -> Bool
onkoEI  = (== Just Ennakkoilmoitus) . onkoJeti 
onkoES  = (== Just Ennakkosuunnitelma) . onkoJeti 
onkoVS  = (== Just Vuosisuunnitelma) . onkoJeti 
onkoLOI = (== Just LOilmoitus) . onkoJeti
onkoRT  = (== Just Ratatyoilmoitus) . onkoRuma
onkoLR  = (== Just Liikenteenrajoite) . onkoRuma

onkoWKT :: Text -> Maybe GeometryType 
onkoWKT = readMaybe . unpack <=< captureTextMaybe [cp|tyyppi|] . (?=~ regex_wkt)
