{-# LANGUAGE RecordWildCards #-}
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