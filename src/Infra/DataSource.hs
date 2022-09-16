{-# LANGUAGE RecordWildCards #-}
{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}
{-# LANGUAGE FlexibleInstances #-}
{-# LANGUAGE TypeApplications #-}
{-# LANGUAGE FlexibleContexts #-}
{-# LANGUAGE OverloadedLabels #-}
{-# LANGUAGE NamedFieldPuns #-}
{-# OPTIONS_GHC -Wno-name-shadowing #-}

module Infra.DataSource where
    
import Universum hiding (get)
import Amcharts.DataSource (luoDatasource, DataType (InfraData, Other), DataSource, mkDataSource)
import Infra.Types ( InfraType(Rata, Liikennepaikkavali, Rautatieliikennepaikka, LiikennepaikanOsa, Raideosuus, Laituri, Elementti, LiikenteenohjauksenRaja, Kunnossapitoalue, Liikenteenohjausalue, Kayttokeskus, Liikennesuunnittelualue), RautatieliikennepaikkaTyyppi, UICCode, RaideosuusTyyppi, LaituriTyyppi, AikataulupaikkaTyyppi (APLiikennepaikanOsa, APRautatieliikennepaikka) )
import URI (ratanumerotUrl, liikennepaikkavalitUrl, rautatieliikennepaikatUrl, liikennepaikanOsatUrl, raideosuudetUrl, laituritUrl, elementitUrl, lorajatUrl, ratapihapalveluTyypitUrl, opastinTyypitUrl, vaihdeTyypitUrl, kunnossapitoalueetMetaUrl, liikenteenohjausalueetMetaUrl, kayttokeskuksetMetaUrl, liikennesuunnittelualueetMetaUrl, infraObjektityypitUrl)
import JSDOM.Types (JSM, FromJSVal (fromJSVal), ToJSVal)
import Types (Ratakmvali(Ratakmvali), Kmetaisyys (Kmetaisyys), Distance (Distance), OID, Ratakmetaisyys (ratanumero), Point, fromListWithTunniste, MultiLineString, kmetaisyys, ratanumero, FintrafficSystem (Infra))
import qualified Data.Map as Map
import Time (Interval)
import Language.Javascript.JSaddle (toJSVal_aeson, JSVal, (!))
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Data.Aeson (ToJSON)
import GHCJS.Marshal.Internal (fromJSVal_generic)
import Monadic (doFromJSVal, readProperty, propFromJSVal)
import Control.Lens ((?~))
import GHC.Records (getField)
import Amcharts.Events (Done (Done, target), on1, dispatch)
import Control.Lens.Action ((^!))
import GetSet (get, setVal)
import Data.Maybe (fromJust)
import Data.List.NonEmpty (singleton)
import Data.Map (mapKeys, mapWithKey)
import Control.Applicative.HT (liftA5, lift5, lift3, lift4)


data RataDto = RataDto {
  ratanumero :: Text,
  ratakilometrit :: NonEmpty Natural
} deriving (Generic, Show)
instance ToJSON RataDto
instance FromJSVal RataDto where
  fromJSVal = doFromJSVal "RataDto" $
    liftA2 RataDto <$> propFromJSVal "ratanumero"
                   <*> propFromJSVal "ratakilometrit"
instance ToJSVal RataDto where
  toJSVal = toJSVal_aeson

ratanumerotDS :: JSM Amcharts.DataSource.DataSource
ratanumerotDS = luoDatasource (InfraData Rata) ratanumerotUrl $ Map.fromList . fmap parseRataDto . concat . Map.elems

parseRataDto :: RataDto -> (Text, Ratakmvali)
parseRataDto RataDto{..} = (ratanumero, Ratakmvali ratanumero (Kmetaisyys (minimum ratakilometrit) (Distance 0)) (Kmetaisyys (maximum ratakilometrit) (Distance 1000)))



data LiikennepaikkavaliDto = LiikennepaikkavaliDto {
  alkuliikennepaikka :: OID,
  loppuliikennepaikka :: OID,
  ratakmvalit :: NonEmpty Ratakmvali,
  objektinVoimassaoloaika :: Interval,
  tunniste :: OID
} deriving (Generic, Show)
instance ToJSON LiikennepaikkavaliDto
instance FromJSVal LiikennepaikkavaliDto where
  fromJSVal = doFromJSVal "LiikennepaikkavaliDto" $
    lift5 LiikennepaikkavaliDto <$> propFromJSVal "alkuliikennepaikka"
                                <*> propFromJSVal "loppuliikennepaikka"
                                <*> propFromJSVal "ratakmvalit"
                                <*> propFromJSVal "objektinVoimassaoloaika"
                                <*> propFromJSVal "tunniste"

liikennepaikkavalitDS :: JSM Amcharts.DataSource.DataSource
liikennepaikkavalitDS = luoDatasource (InfraData Liikennepaikkavali) (liikennepaikkavalitUrl @LiikennepaikkavaliDto) id



data RautatieliikennepaikkaDto = RautatieliikennepaikkaDto {
  lyhenne :: Text,
  muutRatakmsijainnit :: [Ratakmetaisyys],
  nimi :: Text,
  ratakmvalit :: NonEmpty Ratakmvali,
  tunniste :: OID,
  tyyppi :: RautatieliikennepaikkaTyyppi,
  uicKoodi :: Maybe UICCode,
  virallinenRatakmsijainti :: Maybe Ratakmetaisyys,
  virallinenSijainti :: Maybe Point,
  objektinVoimassaoloaika :: Interval,

  ratakmsijainnit :: Maybe (NonEmpty Ratakmetaisyys),
  geometria :: Maybe Point
} deriving (Generic, Show)
instance ToJSON RautatieliikennepaikkaDto
instance FromJSVal RautatieliikennepaikkaDto where
  fromJSVal = doFromJSVal "RautatieliikennepaikkaDto" $ \x -> do
    a <- propFromJSVal "lyhenne" x
    b <- propFromJSVal "muutRatakmsijainnit" x
    c <- propFromJSVal "nimi" x
    d <- propFromJSVal "ratakmvalit" x
    e <- propFromJSVal "tunniste" x
    f <- propFromJSVal "tyyppi" x
    g <- propFromJSVal "uicKoodi" x
    h <- propFromJSVal "virallinenRatakmsijainti" x
    i <- propFromJSVal "virallinenSijainti" x
    j <- propFromJSVal "objektinVoimassaoloaika" x
    pure $ RautatieliikennepaikkaDto a b c d e f g h i j (Just $ fromList $ maybeToList h <> b) i

rautatieliikennepaikatDS :: JSM Amcharts.DataSource.DataSource
rautatieliikennepaikatDS = luoDatasource (InfraData Rautatieliikennepaikka) (rautatieliikennepaikatUrl @RautatieliikennepaikkaDto) id



data LiikennepaikanOsaDto = LiikennepaikanOsaDto {
  liikennepaikka :: OID,
  lyhenne :: Text,
  muutRatakmsijainnit :: [Ratakmetaisyys],
  nimi :: Text,
  tunniste :: OID,
  uicKoodi :: UICCode,
  virallinenRatakmsijainti :: Maybe Ratakmetaisyys,
  virallinenSijainti :: Point,
  objektinVoimassaoloaika :: Interval,

  ratakmsijainnit :: Maybe (NonEmpty Ratakmetaisyys),
  geometria :: Maybe Point,
  tyyppi :: Maybe Text
} deriving (Generic, Show)
instance ToJSON LiikennepaikanOsaDto
instance FromJSVal LiikennepaikanOsaDto where
  fromJSVal = doFromJSVal "LiikennepaikanOsaDto" $ \x -> do
    a <- propFromJSVal "liikennepaikka" x
    b <- propFromJSVal "lyhenne" x
    c <- propFromJSVal "muutRatakmsijainnit" x
    d <- propFromJSVal "nimi" x
    e <- propFromJSVal "tunniste" x
    f <- propFromJSVal "uicKoodi" x
    g <- propFromJSVal "virallinenRatakmsijainti" x
    h <- propFromJSVal "virallinenSijainti" x
    i <- propFromJSVal "objektinVoimassaoloaika" x
    pure $ LiikennepaikanOsaDto a b c d e f g h i
            (Just $ fromList $ maybeToList g <> c)
            (Just h)
            (Just "liikennepaikanosa")

liikennepaikanOsatDS :: JSM Amcharts.DataSource.DataSource
liikennepaikanOsatDS = luoDatasource (InfraData LiikennepaikanOsa) (liikennepaikanOsatUrl @LiikennepaikanOsaDto) id



data RaideosuusTunnisteDto = RaideosuusTunnisteDto {
  tunniste :: OID,
  ratakmvalit :: NonEmpty Ratakmvali,
  turvalaiteNimi :: Text
} deriving (Generic, Show)
instance ToJSON RaideosuusTunnisteDto
instance FromJSVal RaideosuusTunnisteDto where
  fromJSVal = doFromJSVal "RaideosuusTunnisteDto" $
    lift3 RaideosuusTunnisteDto <$> propFromJSVal "tunniste"
                                <*> propFromJSVal "ratakmvalit"
                                <*> propFromJSVal "turvalaiteNimi"

data RaideosuusDto = RaideosuusDto {
  geometria :: MultiLineString,
  tunniste :: NonEmpty RaideosuusTunnisteDto,
  tyyppi :: RaideosuusTyyppi,
  uicKoodi :: Maybe UICCode,
  objektinVoimassaoloaika :: Interval,

  ratakmSijainnit :: Maybe [Ratakmetaisyys],
  lyhenne :: Maybe Text,
  nimi :: Maybe Text,
  ratakmvalit :: Maybe (NonEmpty Ratakmvali)
} deriving (Generic, Show)
instance ToJSON RaideosuusDto
instance FromJSVal RaideosuusDto where
  fromJSVal = doFromJSVal "RaideosuusDto" $ \x -> do
    a <- propFromJSVal "geometria" x
    b <- propFromJSVal "tunniste" x
    c <- propFromJSVal "tyyppi" x
    d <- propFromJSVal "uicKoodi" x
    e <- propFromJSVal "objektinVoimassaoloaika" x
    pure $ RaideosuusDto a b c d e
            Nothing
            (Just $ turvalaiteNimi $ head b)
            (Just $ turvalaiteNimi $ head b)
            (Just $ (\RaideosuusTunnisteDto{..} -> ratakmvalit) (head b))

raideosuudetDS :: JSM Amcharts.DataSource.DataSource
raideosuudetDS = luoDatasource (InfraData Raideosuus) (raideosuudetUrl @RaideosuusDto) id



data LaituriTunnisteDto = LaituriTunnisteDto {
  tunniste :: OID,
  kuvaus :: Text,
  ratakmvalit :: NonEmpty Ratakmvali,
  tunnus :: Text
} deriving (Generic, Show)
instance ToJSON LaituriTunnisteDto
instance FromJSVal LaituriTunnisteDto where
  fromJSVal = doFromJSVal "LaituriTunnisteDto" $
    lift4 LaituriTunnisteDto <$> propFromJSVal "tunniste"
                             <*> propFromJSVal "kuvaus"
                             <*> propFromJSVal "ratakmvalit"
                             <*> propFromJSVal "tunnus"

data LaituriDto = LaituriDto {
  geometria :: MultiLineString,
  tunniste :: NonEmpty LaituriTunnisteDto,
  tyyppi :: LaituriTyyppi,
  uicKoodi :: Maybe UICCode,
  objektinVoimassaoloaika :: Interval,

  ratakmSijainnit :: Maybe [Ratakmetaisyys],
  lyhenne :: Maybe Text,
  nimi :: Maybe Text,
  ratakmvalit :: Maybe (NonEmpty Ratakmvali)
} deriving (Generic, Show)
instance FromJSVal LaituriDto where
  fromJSVal = doFromJSVal "LaituriDto" $ \x -> do
    a <- propFromJSVal "geometria" x
    b <- propFromJSVal "tunniste" x
    c <- propFromJSVal "tyyppi" x
    d <- propFromJSVal "uicKoodi" x
    e <- propFromJSVal "objektinVoimassaoloaika" x
    pure $ LaituriDto a b c d e
            Nothing
            (Just $ tunnus $ head b)
            (Just $ kuvaus $ head b)
            (Just $ (\LaituriTunnisteDto{..} -> ratakmvalit) (head b))
instance ToJSON LaituriDto

laituritDS :: JSM Amcharts.DataSource.DataSource
laituritDS = luoDatasource (InfraData Laituri) (laituritUrl @LaituriDto) id



data ElementtiDto = ElementtiDto {
  tunniste :: OID,
  nimi :: Text,
  ratakmsijainnit :: NonEmpty Ratakmetaisyys,
  objektinVoimassaoloaika :: Interval
} deriving (Generic, Show)
instance ToJSON ElementtiDto
instance FromJSVal ElementtiDto where
  fromJSVal = doFromJSVal "ElementtiDto" $
    lift4 ElementtiDto <$> propFromJSVal "tunniste"
                       <*> propFromJSVal "nimi"
                       <*> propFromJSVal "ratakmsijainnit"
                       <*> propFromJSVal "objektinVoimassaoloaika"

elementitDS :: JSM Amcharts.DataSource.DataSource
elementitDS = luoDatasource (InfraData Elementti) (elementitUrl @ElementtiDto) id



newtype LiikenteenohjauksenRajaLeikkauksetDto = LiikenteenohjauksenRajaLeikkauksetDto {
  ratakmsijainnit :: NonEmpty Ratakmetaisyys
} deriving (Generic, Show)
instance FromJSVal LiikenteenohjauksenRajaLeikkauksetDto where
  fromJSVal = doFromJSVal "LiikenteenohjauksenRajaLeikkauksetDto" $
    fmap LiikenteenohjauksenRajaLeikkauksetDto <$> propFromJSVal "ratakmsijainnit"
instance ToJSON LiikenteenohjauksenRajaLeikkauksetDto
data LiikenteenohjauksenRajaDto = LiikenteenohjauksenRajaDto {
  tunniste :: OID,
  leikkaukset :: NonEmpty LiikenteenohjauksenRajaLeikkauksetDto,
  objektinVoimassaoloaika :: Interval,

  nimi :: Maybe Text,
  ratakmsijainnit :: Maybe (NonEmpty Ratakmetaisyys)
} deriving (Generic, Show)
instance FromJSVal LiikenteenohjauksenRajaDto where
  fromJSVal = doFromJSVal "LiikenteenohjauksenRajaDto" $ \x -> do
    a <- propFromJSVal "tunniste" x
    b <- propFromJSVal "leikkaukset" x
    c <- propFromJSVal "objektinVoimassaoloaika" x
    pure $ LiikenteenohjauksenRajaDto a b c
            (Just "Liikenteenohjauksen raja")
            (Just $ sconcat ((\LiikenteenohjauksenRajaLeikkauksetDto{..} -> ratakmsijainnit) <$> b))
instance ToJSON LiikenteenohjauksenRajaDto

lorajatDS :: JSM Amcharts.DataSource.DataSource
lorajatDS = luoDatasource (InfraData LiikenteenohjauksenRaja) (lorajatUrl @LiikenteenohjauksenRajaDto) id

data AikataulupaikkaDto = AikataulupaikkaDto {
  lyhenne :: Maybe Text,
  muutRatakmsijainnit :: [Ratakmetaisyys],
  nimi :: Maybe Text,
  ratakmvalit :: NonEmpty Ratakmvali,
  tunniste :: OID,
  tyyppi :: AikataulupaikkaTyyppi,
  uicKoodi :: UICCode,
  virallinenRatakmsijainti :: Maybe Ratakmetaisyys,
  virallinenSijainti :: Maybe Point,
  objektinVoimassaoloaika :: Interval,

  ratakmsijainnit :: [Ratakmetaisyys],
  geometria :: Maybe Point
} deriving Generic
instance ToJSON AikataulupaikkaDto

rauConverter :: RautatieliikennepaikkaDto -> AikataulupaikkaDto
rauConverter RautatieliikennepaikkaDto{..} = AikataulupaikkaDto
  (Just lyhenne)
  muutRatakmsijainnit
  (Just nimi)
  ratakmvalit
  tunniste
  APRautatieliikennepaikka
  (fromJust uicKoodi)
  virallinenRatakmsijainti
  virallinenSijainti
  objektinVoimassaoloaika
  (maybeToList virallinenRatakmsijainti <> muutRatakmsijainnit)
  virallinenSijainti

osaConverter :: LiikennepaikanOsaDto -> AikataulupaikkaDto
osaConverter LiikennepaikanOsaDto{..} = AikataulupaikkaDto
  (Just lyhenne)
  muutRatakmsijainnit
  (Just nimi)
  (singleton $ Ratakmvali (Types.ratanumero $ fromJust virallinenRatakmsijainti) (kmetaisyys $ fromJust virallinenRatakmsijainti) (kmetaisyys $ fromJust virallinenRatakmsijainti))
  tunniste
  APLiikennepaikanOsa
  uicKoodi
  virallinenRatakmsijainti
  (Just virallinenSijainti)
  objektinVoimassaoloaika
  (maybeToList virallinenRatakmsijainti <> muutRatakmsijainnit)
  (Just virallinenSijainti)

raiConverter :: RaideosuusDto -> AikataulupaikkaDto
raiConverter RaideosuusDto{..} = AikataulupaikkaDto
  lyhenne
  []
  nimi
  (fromJust ratakmvalit)
  ((\RaideosuusTunnisteDto{tunniste} -> tunniste) $ head tunniste)
  APRautatieliikennepaikka
  (fromJust uicKoodi)
  Nothing
  Nothing
  objektinVoimassaoloaika
  []
  Nothing

laiConverter :: LaituriDto -> AikataulupaikkaDto
laiConverter LaituriDto{..} = AikataulupaikkaDto
  lyhenne
  []
  nimi
  (fromJust ratakmvalit)
  ((\LaituriTunnisteDto{tunniste} -> tunniste) $ head tunniste)
  APRautatieliikennepaikka
  (fromJust uicKoodi)
  Nothing
  Nothing
  objektinVoimassaoloaika
  []
  Nothing

aikataulupaikatDS :: JSM Amcharts.DataSource.DataSource
aikataulupaikatDS = do
  ds <- mkDataSource
  rds <- rautatieliikennepaikatDS
  osa <- liikennepaikanOsatDS
  rai <- raideosuudetDS
  lai <- laituritDS

  on1 rds $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID RautatieliikennepaikkaDto) <- fromJSVal datJSVal
    js <- toJSVal (rauConverter <$> Map.filter (\RautatieliikennepaikkaDto{..} -> isNothing uicKoodi) dat)
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  on1 osa $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID LiikennepaikanOsaDto) <- fromJSVal datJSVal
    js <- toJSVal (osaConverter <$> dat)
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  on1 rai $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID RaideosuusDto) <- fromJSVal datJSVal
    js <- toJSVal (raiConverter <$> Map.filter (\RaideosuusDto{..} -> isNothing uicKoodi) dat)
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  on1 lai $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID LaituriDto) <- fromJSVal datJSVal
    js <- toJSVal (laiConverter <$> Map.filter (\LaituriDto{..} -> isNothing uicKoodi) dat)
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  pure ds

ratatyoElementitDS :: JSM Amcharts.DataSource.DataSource
ratatyoElementitDS = do
  ds <- mkDataSource
  e <- elementitDS
  r <- lorajatDS

  on1 e $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID ElementtiDto) <- fromJSVal datJSVal
    js <- toJSVal dat
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  on1 r $ \(Done{target}) -> do
    datJSVal <- target ^! get @"data"
    Just dat :: Maybe (Map OID LiikenteenohjauksenRajaDto) <- fromJSVal datJSVal
    js <- toJSVal dat
    ds ^! setVal @"data" js
    dispatch @Done ds js
  
  pure ds

ratapihapalveluTyypitDS :: JSM Amcharts.DataSource.DataSource
ratapihapalveluTyypitDS = luoDatasource (Other "Ratapihapalvelutyypit") (ratapihapalveluTyypitUrl @[Text]) id

data OpastintyyppiDto = OpastintyyppiDto {
  tyyppi :: Text,
  nimi :: Text,
  kulkutienPaatekohta :: Bool
} deriving (Show,Generic)
instance ToJSON OpastintyyppiDto
instance ToJSVal OpastintyyppiDto where
  toJSVal = toJSVal_aeson
instance FromJSVal OpastintyyppiDto where
  fromJSVal = doFromJSVal "OpastintyyppiDto" $
    liftA3 OpastintyyppiDto <$> propFromJSVal "tyyppi"
                            <*> propFromJSVal "nimi"
                            <*> propFromJSVal "kulkutienPaatekohta"

opastintyypitDS :: JSM Amcharts.DataSource.DataSource
opastintyypitDS = luoDatasource (Other "Opastintyypit") (opastinTyypitUrl @[OpastintyyppiDto]) id

data VaihdetyyppiDto = VaihdetyyppiDto {
  tyyppi :: Text,
  lyhenne :: Text
} deriving (Show,Generic)
instance ToJSON VaihdetyyppiDto
instance ToJSVal VaihdetyyppiDto where
  toJSVal = toJSVal_aeson
instance FromJSVal VaihdetyyppiDto where
  fromJSVal = doFromJSVal "VaihdetyyppiDto" $
    liftA2 VaihdetyyppiDto <$> propFromJSVal "tyyppi"
                           <*> propFromJSVal "lyhenne"

vaihdetyypitDS :: JSM Amcharts.DataSource.DataSource
vaihdetyypitDS = luoDatasource (Other "Vaihdetyypit") (vaihdeTyypitUrl @[VaihdetyyppiDto]) id


data KunnossapitoalueDto = KunnossapitoalueDto {
  nimi :: Text,
  objektinVoimassaoloaika :: Interval,
  tunniste :: OID
} deriving (Show, Generic)
instance ToJSON KunnossapitoalueDto
instance FromJSVal KunnossapitoalueDto where
  fromJSVal = doFromJSVal "KunnossapitoalueDto" $
    liftA3 KunnossapitoalueDto <$> propFromJSVal "nimi"
                               <*> propFromJSVal "objektinVoimassaoloaika"
                               <*> propFromJSVal "tunniste"

kpalueetDS :: JSM Amcharts.DataSource.DataSource
kpalueetDS = luoDatasource (InfraData Kunnossapitoalue) (kunnossapitoalueetMetaUrl @KunnossapitoalueDto) id

data LiikenteenohjausalueDto = LiikenteenohjausalueDto {
  nimi :: Text,
  objektinVoimassaoloaika :: Interval,
  tunniste :: OID
} deriving (Show, Generic)
instance ToJSON LiikenteenohjausalueDto
instance FromJSVal LiikenteenohjausalueDto where
  fromJSVal = doFromJSVal "LiikenteenohjausalueDto" $
    liftA3 LiikenteenohjausalueDto <$> propFromJSVal "nimi"
                                   <*> propFromJSVal "objektinVoimassaoloaika"
                                   <*> propFromJSVal "tunniste"

ohjausalueetDS :: JSM Amcharts.DataSource.DataSource
ohjausalueetDS = luoDatasource (InfraData Liikenteenohjausalue) (liikenteenohjausalueetMetaUrl @LiikenteenohjausalueDto) id

data KayttokeskusDto = KayttokeskusDto {
  nimi :: Text,
  objektinVoimassaoloaika :: Interval,
  tunniste :: OID
} deriving (Show, Generic)
instance ToJSON KayttokeskusDto
instance FromJSVal KayttokeskusDto where
  fromJSVal = doFromJSVal "KayttokeskusDto" $
    liftA3 KayttokeskusDto <$> propFromJSVal "nimi"
                           <*> propFromJSVal "objektinVoimassaoloaika"
                           <*> propFromJSVal "tunniste"

kayttokeskuksetDS :: JSM Amcharts.DataSource.DataSource
kayttokeskuksetDS = luoDatasource (InfraData Kayttokeskus) (kayttokeskuksetMetaUrl @KayttokeskusDto) id


data LiikennesuunnittelualueDto = LiikennesuunnittelualueDto {
  nimi :: Text,
  objektinVoimassaoloaika :: Interval,
  tunniste :: OID
} deriving (Show, Generic)
instance ToJSON LiikennesuunnittelualueDto
instance FromJSVal LiikennesuunnittelualueDto where
  fromJSVal = doFromJSVal "LiikennesuunnittelualueDto" $
    liftA3 LiikennesuunnittelualueDto <$> propFromJSVal "nimi"
                                      <*> propFromJSVal "objektinVoimassaoloaika"
                                      <*> propFromJSVal "tunniste"

lisualueetDS :: JSM Amcharts.DataSource.DataSource
lisualueetDS = luoDatasource (InfraData Liikennesuunnittelualue) (liikennesuunnittelualueetMetaUrl @LiikennesuunnittelualueDto) id

data ObjektityyppiDto = ObjektityyppiDto {
  tyyppinumero :: Natural,
  nimi :: Text,
  name :: Text
} deriving (Show,Generic)
instance ToJSON ObjektityyppiDto
instance FromJSVal ObjektityyppiDto where
  fromJSVal = doFromJSVal "ObjektityyppiDto" $
    liftA3 ObjektityyppiDto <$> propFromJSVal "tyyppinumero"
                            <*> propFromJSVal "nimi"
                            <*> propFromJSVal "name"

parseObjektityyppiDto :: ObjektityyppiDto -> (Natural,ObjektityyppiDto)
parseObjektityyppiDto = (,) <$> tyyppinumero <*> id

objektityypitDS :: JSM Amcharts.DataSource.DataSource
objektityypitDS = luoDatasource (Other "Objektityypit") (infraObjektityypitUrl @ObjektityyppiDto) $ Map.fromList . fmap parseObjektityyppiDto . toList