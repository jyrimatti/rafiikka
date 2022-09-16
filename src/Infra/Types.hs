{-# LANGUAGE DeriveGeneric #-}
{-# LANGUAGE DuplicateRecordFields #-}
{-# LANGUAGE ScopedTypeVariables #-}
{-# LANGUAGE DataKinds #-}
{-# LANGUAGE GADTs #-}
{-# LANGUAGE MultiParamTypeClasses #-}

module Infra.Types where
    
import Universum
import Language.Javascript.JSaddle (FromJSVal(fromJSVal), ToJSVal)
import Monadic (doFromJSVal)
import Language.Javascript.JSaddle.Classes (ToJSVal(toJSVal))
import Yleiset ()
import Data.Text (unpack)
import Data.Aeson (ToJSON (toJSON))

data InfraType = 
      Objektityyppi
    | Elementti
    | Laituri
    | LiikenteenohjauksenRaja
    | LiikennepaikanOsa
    | Liikennepaikkavali
    | Raide
    | Raideosuus
    | Rata
    | Rautatieliikennepaikka
  deriving (Show, Enum, Bounded, Read)

instance ToJSVal InfraType where
    toJSVal = toJSVal . infraType

instance FromJSVal InfraType where
  fromJSVal = doFromJSVal "InfraType" $ \x -> do
    nat <- MaybeT $ fromJSVal x
    hoistMaybe $ findInfraType nat

infraType :: InfraType -> Maybe Natural
infraType Objektityyppi           = Nothing
infraType Elementti               = Nothing
infraType Laituri                 = Just 37
infraType LiikenteenohjauksenRaja = Just 69
infraType LiikennepaikanOsa       = Just 39
infraType Liikennepaikkavali      = Just 40
infraType Raide                   = Just 44
infraType Raideosuus              = Just 36
infraType Rata                    = Just 45
infraType Rautatieliikennepaikka  = Just 39

infraTypes :: [InfraType]
infraTypes = [minBound ..]

findInfraType :: Natural -> Maybe InfraType
findInfraType x = find ((== Just x) . infraType) infraTypes

data ElementtiTypeName = Akselinlaskija
                       | Baliisi
                       | Kuumakayntiilmaisin
                       | Liikennepaikanraja
                       | Opastin
                       | Puskin
                       | Pyoravoimailmaisin
                       | Raideeristys
                       | Pysaytyslaite
                       | Rfidlukija
                       | Ryhmityseristin
                       | Sahkoistyspaattyy
                       | Seislevy
                       | Vaihde
                       | Virroitinvalvontakamera
                       | Erotusjakso
                       | Erotuskentta
                       | Maadoitin
                       | Tyonaikaineneristin
                       | Kaantopoyta
                       | Pyoraprofiilimittalaite
                       | Telivalvonta
                       | Erotin
                       | Tasoristeysvalojenpyoratunnistin
    deriving (Show,Read)

instance FromJSVal ElementtiTypeName where
    fromJSVal = doFromJSVal "ElementtiTypeName" $ \x -> do
        xx :: Text <- MaybeT $ fromJSVal x
        hoistMaybe $ readMaybe (unpack xx)

data RautatieliikennepaikkaTyyppi = Liikennepaikka | Seisake | Linjavaihde
  deriving Show
instance FromJSVal RautatieliikennepaikkaTyyppi where
  fromJSVal = doFromJSVal "RautatieliikennepaikkaTyyppi" $ \x -> do
    xx :: Text <- MaybeT $ fromJSVal x
    case xx of
      "liikennepaikka" -> pure Liikennepaikka
      "seisake" -> pure Seisake
      "linjavaihde" -> pure Linjavaihde
      _ -> mzero

instance ToJSON RautatieliikennepaikkaTyyppi where
  toJSON Liikennepaikka = "liikennepaikka"
  toJSON Seisake = "seisake"
  toJSON Linjavaihde = "linjavaihde"

newtype UICCode = UICCode Natural
  deriving (Generic, Show)
instance FromJSVal UICCode where
  fromJSVal = doFromJSVal "UICCode" $
    MaybeT . fromJSVal
instance ToJSON UICCode

data RaideosuusTyyppi = Eristysosuus | Akselinlaskentaosuus | Aanitaajuusvirtapiiri
  deriving Show

instance FromJSVal RaideosuusTyyppi where
  fromJSVal = doFromJSVal "RaideosuusTyyppi" $ \x -> do
    xx :: Text <- MaybeT $ fromJSVal x
    case xx of
      "eristysosuus" -> pure Eristysosuus
      "akselinlaskentaosuus" -> pure Akselinlaskentaosuus
      "äänitaajuusvirtapiiri" -> pure Aanitaajuusvirtapiiri
      _ -> mzero

instance ToJSON RaideosuusTyyppi where
  toJSON Eristysosuus = "eristysosuus"
  toJSON Akselinlaskentaosuus = "akselinlaskentaosuus"
  toJSON Aanitaajuusvirtapiiri = "äänitaajuusvirtapiiri"

data LaituriTyyppi = Henkilo | Kuormaus
  deriving Show

instance FromJSVal LaituriTyyppi where
  fromJSVal = doFromJSVal "LaituriTyyppi" $ \x -> do
    xx :: Text <- MaybeT $ fromJSVal x
    case xx of
      "henkilo" -> pure Henkilo
      "kuormaus" -> pure Kuormaus
      _ -> mzero

instance ToJSON LaituriTyyppi where
  toJSON Henkilo = "henkilo"
  toJSON Kuormaus = "kuormaus"

data AikataulupaikkaTyyppi = APRautatieliikennepaikka | APLiikennepaikanOsa | APRaideosuus | APLaituri
  deriving Generic
instance ToJSON AikataulupaikkaTyyppi